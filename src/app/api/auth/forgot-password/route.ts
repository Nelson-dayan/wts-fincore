import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/db/connect";
import { UserModel } from "@/lib/db/models";
import { getClientIpFromRequest } from "@/lib/security/client-ip";
import {
  rateLimit,
  FORGOT_PASSWORD_IP_LIMIT,
  FORGOT_PASSWORD_EMAIL_LIMIT,
  FORGOT_PASSWORD_WINDOW_MS,
} from "@/lib/rate-limit/memory";
import { sendPasswordResetEmail } from "@/lib/email/send-email";

/**
 * Standard generic response returned for all valid requests (Finding 1 Remediation).
 * Guarantees identical payload shape and prevents user enumeration.
 * Under NO circumstances is a token or resetUrl ever serialized in this response.
 */
const GENERIC_SUCCESS_RESPONSE = {
  ok: true,
  message:
    "If an account with that email exists, a password reset link has been sent to your email address.",
};

export async function POST(req: Request) {
  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { message: "Invalid JSON payload." },
        { status: 400 }
      );
    }

    const email = String(body?.email || "").trim().toLowerCase();

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { message: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    // 1. Enforce Per-IP Rate Limiting (Finding 2 Remediation)
    const ip = getClientIpFromRequest(req);
    const ipRl = rateLimit(
      `forgot-password:ip:${ip}`,
      FORGOT_PASSWORD_IP_LIMIT,
      FORGOT_PASSWORD_WINDOW_MS
    );
    if (!ipRl.ok) {
      return NextResponse.json(
        {
          message:
            "Too many password reset requests from this IP address. Please try again later.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(ipRl.retryAfterMs / 1000)),
          },
        }
      );
    }

    // 2. Enforce Per-Email Rate Limiting (Finding 2 Remediation: Prevents Email-Bombing & Distributed Harvesting)
    const emailRl = rateLimit(
      `forgot-password:email:${email}`,
      FORGOT_PASSWORD_EMAIL_LIMIT,
      FORGOT_PASSWORD_WINDOW_MS
    );
    if (!emailRl.ok) {
      return NextResponse.json(
        {
          message:
            "Too many password reset requests for this email address. Please wait before trying again.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(emailRl.retryAfterMs / 1000)),
          },
        }
      );
    }

    await connectDB();
    const user = await UserModel.findOne({ email }).select(
      "+resetPasswordToken +resetPasswordExpires"
    );

    if (!user) {
      // Return identical generic success message to prevent user enumeration
      return NextResponse.json(GENERIC_SUCCESS_RESPONSE, { status: 200 });
    }

    // 3. Generate Cryptographically Secure Raw Token
    const rawToken = crypto.randomBytes(32).toString("hex");

    // 4. Store Only the SHA-256 Hash of the Token in Database (CWE-640 & CWE-312 Defense in Depth)
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour validity

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = expires;
    await user.save();

    // 5. Construct Secure Reset Link for Out-of-Band Delivery Exclusively
    const origin = req.headers.get("origin") || req.headers.get("host") || "";
    const protocol =
      origin.includes("localhost") || origin.includes("127.0.0.1")
        ? "http"
        : "https";
    const baseUrl = origin.startsWith("http")
      ? origin
      : `${protocol}://${origin}`;
    const resetUrl = `${baseUrl}/reset-password?token=${rawToken}&email=${encodeURIComponent(
      email
    )}`;

    // 6. Deliver Reset URL Out-of-Band via Email Service (NEVER in HTTP response)
    await sendPasswordResetEmail({
      to: email,
      resetUrl,
      userName: user.name,
    });

    // 7. Return Constant Response with Zero Credential Disclosure
    return NextResponse.json(GENERIC_SUCCESS_RESPONSE, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to process request" },
      { status: 500 }
    );
  }
}
