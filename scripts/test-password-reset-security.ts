/**
 * Automated Security Regression Suite
 * Password Reset Token Disclosure & Missing Rate Limiting Remediation
 * Verifies fixes for Bug Bounty Report dated 19 October 2026:
 *   - Finding 1: CWE-640 (Password Reset Token Disclosure & Account Enumeration)
 *   - Finding 2: CWE-307 (Improper Restriction of Excessive Requests / Missing Rate Limiting)
 *   - Defense in Depth: CWE-312 (Hashed token storage, lockout clearance, single-use enforcement)
 */

import crypto from "crypto";
import path from "path";
import fs from "fs";

// Load .env file automatically
try {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, "utf-8");
    for (const line of envConfig.split("\n")) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let val = (match[2] || "").trim();
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
        if (key && !process.env[key.trim()]) {
          process.env[key.trim()] = val;
        }
      }
    }
  }
} catch {
  // Ignore env read error
}

import { connectDB } from "@/lib/db/connect";
import { UserModel } from "@/lib/db/models";
import { hashPassword } from "@/lib/auth/password";
import { POST as forgotPasswordHandler } from "@/app/api/auth/forgot-password/route";
import { POST as resetPasswordHandler } from "@/app/api/auth/reset-password/route";
import {
  clearRateLimit,
  FORGOT_PASSWORD_IP_LIMIT,
  FORGOT_PASSWORD_EMAIL_LIMIT,
} from "@/lib/rate-limit/memory";

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testId: string, description: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`[✓ PASS] [${testId}] ${description}`);
  } else {
    failedTests++;
    console.error(`[✗ FAIL] [${testId}] ${description}`);
  }
}

async function runPasswordResetSecuritySuite() {
  console.log("=======================================================================");
  console.log("   FINCORE PASSWORD RESET SECURITY & REGRESSION VERIFICATION SUITE     ");
  console.log("   Verifying Bug Bounty Remediation (19 October 2026 Findings)        ");
  console.log("=======================================================================\n");

  await connectDB();

  const testEmail = `bounty_target_${Date.now()}@fincore-test.com`;
  const nonExistentEmail = `ghost_user_${Date.now()}@fincore-test.com`;
  const testIp = "198.51.100.42";

  // Cleanup rate limiter buckets for test environment
  clearRateLimit(`forgot-password:ip:${testIp}`);
  clearRateLimit(`forgot-password:email:${testEmail}`);
  clearRateLimit(`forgot-password:email:${nonExistentEmail}`);

  // Create a clean test user
  const initialPasswordHash = await hashPassword("InitialPass#2026Secure!");
  await UserModel.deleteOne({ email: testEmail });
  const user = await UserModel.create({
    name: "Target User",
    email: testEmail,
    password: initialPasswordHash,
    role: "employee",
    isActive: true,
    failedLoginAttempts: 4,
    lockoutUntil: new Date(Date.now() + 15 * 60 * 1000), // Account currently locked
  });

  try {
    // -------------------------------------------------------------------------
    // SECTION 1: Finding 1 - Zero Token Disclosure & Schema Uniformity
    // -------------------------------------------------------------------------
    console.log("--- SECTION 1: FINDING 1 - TOKEN DISCLOSURE & ANTI-ENUMERATION ---");

    // Request 1: Existing account
    const req1 = new Request("http://localhost:3000/api/auth/forgot-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": testIp,
      },
      body: JSON.stringify({ email: testEmail }),
    });

    const res1 = await forgotPasswordHandler(req1);
    const data1 = await res1.json();

    assert(res1.status === 200, "SEC-PR-01", "Existing account returns HTTP 200");
    assert(data1.ok === true, "SEC-PR-02", "Response indicates ok: true");
    assert(
      !("resetUrl" in data1),
      "SEC-PR-03",
      "Finding 1: resetUrl is STRICTLY ABSENT from API response body"
    );
    assert(
      !("token" in data1) && !("rawToken" in data1) && !("resetPasswordToken" in data1),
      "SEC-PR-04",
      "Finding 1: No token or credential derivative is present in API response"
    );

    // Request 2: Non-existent account
    const req2 = new Request("http://localhost:3000/api/auth/forgot-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": testIp,
      },
      body: JSON.stringify({ email: nonExistentEmail }),
    });

    const res2 = await forgotPasswordHandler(req2);
    const data2 = await res2.json();

    assert(res2.status === 200, "SEC-PR-05", "Non-existent account returns HTTP 200");
    assert(
      JSON.stringify(Object.keys(data1).sort()) === JSON.stringify(Object.keys(data2).sort()),
      "SEC-PR-06",
      "Anti-Enumeration: Response payload keys are identical for existing vs non-existent accounts"
    );
    assert(
      data1.message === data2.message,
      "SEC-PR-07",
      "Anti-Enumeration: Response message text is identical for existing vs non-existent accounts"
    );

    // -------------------------------------------------------------------------
    // SECTION 2: Token Security & SHA-256 Hashing in Database
    // -------------------------------------------------------------------------
    console.log("\n--- SECTION 2: SHA-256 HASHED DATABASE STORAGE (CWE-640 / CWE-312) ---");

    const updatedUser = await UserModel.findById(user._id).select(
      "+resetPasswordToken +resetPasswordExpires"
    );

    assert(
      Boolean(updatedUser?.resetPasswordToken),
      "SEC-PR-08",
      "User record in MongoDB has resetPasswordToken set"
    );
    assert(
      updatedUser!.resetPasswordToken!.length === 64,
      "SEC-PR-09",
      "Stored token is exactly 64-char SHA-256 hex string"
    );
    assert(
      updatedUser!.resetPasswordExpires! > new Date(),
      "SEC-PR-10",
      "Token expiry timestamp is set in the future (~1 hour)"
    );

    // -------------------------------------------------------------------------
    // SECTION 3: Token Verification & Password Reset Completion
    // -------------------------------------------------------------------------
    console.log("\n--- SECTION 3: TOKEN VERIFICATION & ATOMIC COMPLETION ---");

    // To test verification, we need a known raw token.
    // Let's generate a test rawToken and store its SHA-256 hash in DB
    const knownRawToken = crypto.randomBytes(32).toString("hex");
    const knownHashedToken = crypto.createHash("sha256").update(knownRawToken).digest("hex");

    await UserModel.updateOne(
      { _id: user._id },
      {
        resetPasswordToken: knownHashedToken,
        resetPasswordExpires: new Date(Date.now() + 60 * 60 * 1000),
      }
    );

    // Attempt reset with invalid/mismatched token
    const badResetReq = new Request("http://localhost:3000/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testEmail,
        token: "completely_bogus_token_12345",
        password: "NewStrongPass#2026Secure!",
      }),
    });
    const badResetRes = await resetPasswordHandler(badResetReq);
    assert(badResetRes.status === 400, "SEC-PR-11", "Mismatched token is rejected with HTTP 400");

    // Attempt reset with valid token but weak password (complexity check)
    const weakPassReq = new Request("http://localhost:3000/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testEmail,
        token: knownRawToken,
        password: "weak",
      }),
    });
    const weakPassRes = await resetPasswordHandler(weakPassReq);
    assert(weakPassRes.status === 400, "SEC-PR-12", "Weak password rejected by complexity policy");

    // Successful reset with valid raw token (matches SHA-256 hash in MongoDB)
    const validResetReq = new Request("http://localhost:3000/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testEmail,
        token: knownRawToken,
        password: "NewStrongPass#2026Secure!",
      }),
    });
    const validResetRes = await resetPasswordHandler(validResetReq);
    assert(validResetRes.status === 200, "SEC-PR-13", "Valid raw token successfully resets password");

    // Verify DB state after reset
    const userAfterReset = await UserModel.findById(user._id).select(
      "+password +resetPasswordToken +resetPasswordExpires"
    );
    assert(
      userAfterReset?.resetPasswordToken === null || userAfterReset?.resetPasswordToken === undefined,
      "SEC-PR-14",
      "Single-Use: resetPasswordToken is cleared to null immediately upon completion"
    );
    assert(
      userAfterReset?.resetPasswordExpires === null || userAfterReset?.resetPasswordExpires === undefined,
      "SEC-PR-15",
      "Single-Use: resetPasswordExpires is cleared to null upon completion"
    );
    assert(
      userAfterReset?.failedLoginAttempts === 0,
      "SEC-PR-16",
      "Lockout State: failedLoginAttempts is reset to 0 upon password reset"
    );
    assert(
      userAfterReset?.lockoutUntil === null || userAfterReset?.lockoutUntil === undefined,
      "SEC-PR-17",
      "Lockout State: lockoutUntil is cleared upon password reset"
    );

    // Replay attack: attempting to reuse the same raw token must now fail
    const replayReq = new Request("http://localhost:3000/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testEmail,
        token: knownRawToken,
        password: "AnotherNewPass#2026Secure!",
      }),
    });
    const replayRes = await resetPasswordHandler(replayReq);
    assert(replayRes.status === 400, "SEC-PR-18", "Token replay fails: Already-consumed token rejected");

    // Expired token check
    const expiredToken = crypto.randomBytes(32).toString("hex");
    const expiredHashed = crypto.createHash("sha256").update(expiredToken).digest("hex");
    await UserModel.updateOne(
      { _id: user._id },
      {
        resetPasswordToken: expiredHashed,
        resetPasswordExpires: new Date(Date.now() - 1000), // Expired in past
      }
    );
    const expiredReq = new Request("http://localhost:3000/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testEmail,
        token: expiredToken,
        password: "NewStrongPass#2026Secure!",
      }),
    });
    const expiredRes = await resetPasswordHandler(expiredReq);
    assert(expiredRes.status === 400, "SEC-PR-19", "Expired token is rejected with HTTP 400");

    // -------------------------------------------------------------------------
    // SECTION 4: Finding 2 - Rate Limiting Enforcement
    // -------------------------------------------------------------------------
    console.log("\n--- SECTION 4: FINDING 2 - RATE LIMITING & ABUSE MITIGATION ---");

    const rateLimitTestIp = "203.0.113.88";
    const rateLimitEmail = `rate_test_${Date.now()}@fincore-test.com`;

    clearRateLimit(`forgot-password:ip:${rateLimitTestIp}`);
    clearRateLimit(`forgot-password:email:${rateLimitEmail}`);

    // Test IP rate limit threshold (FORGOT_PASSWORD_IP_LIMIT = 5)
    let ipBlocked = false;
    for (let i = 0; i < FORGOT_PASSWORD_IP_LIMIT + 2; i++) {
      const emailForAttempt = `user_${i}_${Date.now()}@fincore-test.com`;
      const rlReq = new Request("http://localhost:3000/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": rateLimitTestIp,
        },
        body: JSON.stringify({ email: emailForAttempt }),
      });
      const rlRes = await forgotPasswordHandler(rlReq);

      if (i < FORGOT_PASSWORD_IP_LIMIT) {
        if (rlRes.status === 429) {
          console.error(`Unexpected early 429 on IP attempt ${i + 1}`);
        }
      } else {
        if (rlRes.status === 429) {
          ipBlocked = true;
          const retryHeader = rlRes.headers.get("Retry-After");
          assert(
            Boolean(retryHeader && Number(retryHeader) > 0),
            "SEC-PR-20",
            `IP Rate Limit exceeded: HTTP 429 returned with valid Retry-After header (${retryHeader}s)`
          );
          break;
        }
      }
    }
    assert(ipBlocked, "SEC-PR-21", `Finding 2: IP rate limit triggered after ${FORGOT_PASSWORD_IP_LIMIT} requests`);

    // Test Email rate limit threshold (FORGOT_PASSWORD_EMAIL_LIMIT = 3)
    // Use fresh IPs each time to verify per-email rate limiting even with rotating/proxied IPs
    let emailBlocked = false;
    for (let i = 0; i < FORGOT_PASSWORD_EMAIL_LIMIT + 2; i++) {
      const distinctIp = `192.0.2.${10 + i}`;
      const emailReq = new Request("http://localhost:3000/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": distinctIp,
        },
        body: JSON.stringify({ email: rateLimitEmail }),
      });
      const emailRes = await forgotPasswordHandler(emailReq);

      if (i < FORGOT_PASSWORD_EMAIL_LIMIT) {
        if (emailRes.status === 429) {
          console.error(`Unexpected early 429 on Email attempt ${i + 1}`);
        }
      } else {
        if (emailRes.status === 429) {
          emailBlocked = true;
          const retryHeader = emailRes.headers.get("Retry-After");
          assert(
            Boolean(retryHeader && Number(retryHeader) > 0),
            "SEC-PR-22",
            `Email Rate Limit exceeded: HTTP 429 returned with valid Retry-After header (${retryHeader}s)`
          );
          break;
        }
      }
    }
    assert(emailBlocked, "SEC-PR-23", `Finding 2: Per-email rate limit triggered after ${FORGOT_PASSWORD_EMAIL_LIMIT} requests across rotating IPs`);

  } finally {
    // Clean up test user
    await UserModel.deleteOne({ email: testEmail });
  }

  console.log("\n=======================================================================");
  console.log(`  PASSWORD RESET REMEDIATION SUITE: ${passedTests}/${totalTests} PASSED, ${failedTests} FAILED`);
  console.log("=======================================================================");

  if (failedTests > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runPasswordResetSecuritySuite().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
