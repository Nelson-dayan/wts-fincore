/**
 * FinCore User Management & RBAC Security Integration Suite
 * Verifies post-audit remediation across priorities:
 *   - Priority 1: Session invalidation and deactivation enforcement (HTTP 401)
 *   - Priority 2: Privilege escalation prevention on self-PATCH & company scoping (HTTP 403)
 *   - Priority 3: Disabling of unsafe permanent deletion (HTTP 400)
 *   - Priority 4: Concurrency-safe last active Super Admin protection
 *   - Priority 6: Error handling (Malformed IDs -> HTTP 400, Missing -> HTTP 404)
 */

import fs from "fs";
import path from "path";

// Load .env
try {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, "utf-8");
    for (const line of envConfig.split("\n")) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
        const [key, ...vals] = trimmed.split("=");
        const val = vals.join("=").trim();
        if (key && !process.env[key.trim()]) {
          process.env[key.trim()] = val;
        }
      }
    }
  }
} catch {
  // Ignore
}

import { connectDB } from "../src/lib/db/connect";
import { UserModel, CompanyModel, CounterModel } from "../src/lib/db/models";
import { PATCH, DELETE } from "../src/app/api/admin/users/[userId]/route";
import { __setTestSession } from "../src/lib/auth/require-role";
import mongoose, { Types } from "mongoose";

async function runRealApiSecuritySuite() {
  console.log("=======================================================================");
  console.log("  FINCORE REAL API USER RBAC & SESSION SECURITY REGRESSION SUITE       ");
  console.log("=======================================================================\n");

  await connectDB();

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`✅ PASS: ${desc}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${desc}`);
      failed++;
    }
  }

  const testSuffix = Date.now();
  const companyAId = new mongoose.Types.ObjectId();
  const companyBId = new mongoose.Types.ObjectId();

  const superAdmin1Id = new mongoose.Types.ObjectId();
  const superAdmin2Id = new mongoose.Types.ObjectId();
  const adminAId = new mongoose.Types.ObjectId();
  const adminBId = new mongoose.Types.ObjectId();
  const employeeAId = new mongoose.Types.ObjectId();
  const employeeBId = new mongoose.Types.ObjectId();
  let otherSuperAdminIds: any[] = [];

  try {
    // 1. Setup isolated test companies
    await CompanyModel.create([
      { _id: companyAId, name: `Company A ${testSuffix}`, code: `CA_${testSuffix}`, isActive: true, deletedAt: null },
      { _id: companyBId, name: `Company B ${testSuffix}`, code: `CB_${testSuffix}`, isActive: true, deletedAt: null },
    ]);

    // 2. Setup isolated test users
    await UserModel.create([
      {
        _id: superAdmin1Id,
        name: "Test SuperAdmin 1",
        email: `super1_${testSuffix}@fincore-test.com`,
        password: "HashedPassword123!",
        role: "super_admin",
        isActive: true,
      },
      {
        _id: superAdmin2Id,
        name: "Test SuperAdmin 2",
        email: `super2_${testSuffix}@fincore-test.com`,
        password: "HashedPassword123!",
        role: "super_admin",
        isActive: true,
      },
      {
        _id: adminAId,
        name: "Test Admin A",
        email: `adminA_${testSuffix}@fincore-test.com`,
        password: "HashedPassword123!",
        role: "admin",
        companyIds: [companyAId],
        primaryCompanyId: companyAId,
        companyMemberships: [{ companyId: companyAId, role: "company_admin", isDefault: true }],
        isActive: true,
      },
      {
        _id: adminBId,
        name: "Test Admin B",
        email: `adminB_${testSuffix}@fincore-test.com`,
        password: "HashedPassword123!",
        role: "admin",
        companyIds: [companyBId],
        primaryCompanyId: companyBId,
        companyMemberships: [{ companyId: companyBId, role: "company_admin", isDefault: true }],
        isActive: true,
      },
      {
        _id: employeeAId,
        name: "Test Employee A",
        email: `empA_${testSuffix}@fincore-test.com`,
        password: "HashedPassword123!",
        role: "employee",
        companyIds: [companyAId],
        primaryCompanyId: companyAId,
        companyMemberships: [{ companyId: companyAId, role: "employee", isDefault: true }],
        isActive: true,
      },
      {
        _id: employeeBId,
        name: "Test Employee B",
        email: `empB_${testSuffix}@fincore-test.com`,
        password: "HashedPassword123!",
        role: "employee",
        companyIds: [companyBId],
        primaryCompanyId: companyBId,
        companyMemberships: [{ companyId: companyBId, role: "employee", isDefault: true }],
        isActive: true,
      },
    ]);

    // Helper for creating synthetic requests
    function makeRequest(method: string, url: string, body?: any) {
      return new Request(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
    }

    console.log("--- PRIORITY 1: SESSION INVALIDATION & DEACTIVATION ENFORCEMENT ---");

    // Test 1: Active admin can access API
    __setTestSession({ user: { id: adminAId.toString(), role: "admin" } });
    const resActive = await PATCH(
      makeRequest("PATCH", `http://localhost/api/admin/users/${employeeAId}`, { name: "Updated Name" }),
      { params: Promise.resolve({ userId: employeeAId.toString() }) }
    );
    assert(resActive.status === 200, "Active admin session successfully accesses API (HTTP 200)");

    // Deactivate adminA directly in DB
    await UserModel.findByIdAndUpdate(adminAId, { isActive: false });

    // Test 2: Deactivated admin attempt to call API with existing session
    const resDeactivated = await PATCH(
      makeRequest("PATCH", `http://localhost/api/admin/users/${employeeAId}`, { name: "Attack While Inactive" }),
      { params: Promise.resolve({ userId: employeeAId.toString() }) }
    );
    assert(
      resDeactivated.status === 401,
      "Immediate session invalidation: Deactivated user receives HTTP 401 Unauthorized"
    );

    // Reactivate adminA
    await UserModel.findByIdAndUpdate(adminAId, { isActive: true });
    const resReactivated = await PATCH(
      makeRequest("PATCH", `http://localhost/api/admin/users/${employeeAId}`, { name: "Employee A Valid" }),
      { params: Promise.resolve({ userId: employeeAId.toString() }) }
    );
    assert(resReactivated.status === 200, "Reactivated user can access API again (HTTP 200)");

    console.log("\n--- PRIORITY 2: PRIVILEGE ESCALATION PREVENTION (SELF-PATCH & SCOPE) ---");

    // Test 3: Standard Admin attempting to escalate own role to super_admin
    const resSelfRole = await PATCH(
      makeRequest("PATCH", `http://localhost/api/admin/users/${adminAId}`, { role: "super_admin" }),
      { params: Promise.resolve({ userId: adminAId.toString() }) }
    );
    assert(resSelfRole.status === 403, "Self-PATCH: Disallow role change on own account (HTTP 403)");

    // Test 4: Standard Admin attempting to grant themselves groupViewAccess
    const resSelfGroupView = await PATCH(
      makeRequest("PATCH", `http://localhost/api/admin/users/${adminAId}`, { groupViewAccess: true }),
      { params: Promise.resolve({ userId: adminAId.toString() }) }
    );
    assert(
      resSelfGroupView.status === 403,
      "Self-PATCH: Disallow granting groupViewAccess on own account (HTTP 403)"
    );

    // Test 5: Standard Admin attempting to assign unauthorized company to themselves
    const resSelfCompany = await PATCH(
      makeRequest("PATCH", `http://localhost/api/admin/users/${adminAId}`, { companyIds: [companyBId.toString()] }),
      { params: Promise.resolve({ userId: adminAId.toString() }) }
    );
    assert(
      resSelfCompany.status === 403,
      "Self-PATCH: Disallow altering company scopes on own account (HTTP 403)"
    );

    // Test 6: Standard Admin legitimate self-service profile update (name, phone)
    const resSelfValid = await PATCH(
      makeRequest("PATCH", `http://localhost/api/admin/users/${adminAId}`, { name: "Admin A Updated", phone: "+971501112233" }),
      { params: Promise.resolve({ userId: adminAId.toString() }) }
    );
    assert(
      resSelfValid.status === 200,
      "Self-PATCH: Legitimate profile update (name, phone) allowed (HTTP 200)"
    );

    console.log("\n--- PRIORITY 2: PEER & SUPER ADMIN PROTECTION ---");

    // Test 7: Standard Admin attempting to modify peer Admin
    const resAdminModAdmin = await PATCH(
      makeRequest("PATCH", `http://localhost/api/admin/users/${adminBId}`, { name: "Tampered Peer" }),
      { params: Promise.resolve({ userId: adminBId.toString() }) }
    );
    assert(resAdminModAdmin.status === 403, "Admin cannot modify peer Admin account (HTTP 403)");

    // Test 8: Standard Admin attempting to modify Super Admin
    const resAdminModSuper = await PATCH(
      makeRequest("PATCH", `http://localhost/api/admin/users/${superAdmin1Id}`, { name: "Tampered Super" }),
      { params: Promise.resolve({ userId: superAdmin1Id.toString() }) }
    );
    assert(resAdminModSuper.status === 403, "Admin cannot modify Super Admin account (HTTP 403)");

    // Test 9: Standard Admin attempting to deactivate peer Admin
    const resAdminDeactivateAdmin = await DELETE(
      makeRequest("DELETE", `http://localhost/api/admin/users/${adminBId}`),
      { params: Promise.resolve({ userId: adminBId.toString() }) }
    );
    assert(resAdminDeactivateAdmin.status === 403, "Admin cannot deactivate peer Admin account (HTTP 403)");

    // Test 10: Standard Admin attempting to deactivate Super Admin
    const resAdminDeactivateSuper = await DELETE(
      makeRequest("DELETE", `http://localhost/api/admin/users/${superAdmin1Id}`),
      { params: Promise.resolve({ userId: superAdmin1Id.toString() }) }
    );
    assert(resAdminDeactivateSuper.status === 403, "Admin cannot deactivate Super Admin account (HTTP 403)");

    console.log("\n--- PRIORITY 2: CROSS-COMPANY ISOLATION ---");

    // Test 11: Admin A attempting to manage Employee B (outside Company A scope)
    const resCrossCompany = await PATCH(
      makeRequest("PATCH", `http://localhost/api/admin/users/${employeeBId}`, { name: "Tampered Employee B" }),
      { params: Promise.resolve({ userId: employeeBId.toString() }) }
    );
    assert(
      resCrossCompany.status === 403,
      "Cross-Company Isolation: Admin cannot manage user outside authorized scope (HTTP 403)"
    );

    // Test 12: Admin A attempting to assign unauthorized Company B to Employee A
    const resAssignUnauthorizedComp = await PATCH(
      makeRequest("PATCH", `http://localhost/api/admin/users/${employeeAId}`, { companyIds: [companyAId.toString(), companyBId.toString()] }),
      { params: Promise.resolve({ userId: employeeAId.toString() }) }
    );
    assert(
      resAssignUnauthorizedComp.status === 403,
      "Scope Boundary: Admin cannot assign companies outside authorized scope (HTTP 403)"
    );

    console.log("\n--- PRIORITY 3: PERMANENT DELETION BEING DISABLED ---");

    // Switch to Super Admin session for deletion tests
    __setTestSession({ user: { id: superAdmin1Id.toString(), role: "super_admin" } });

    // Test 13: Attempt permanent deletion mode
    const resPermanentDelete = await DELETE(
      makeRequest("DELETE", `http://localhost/api/admin/users/${employeeAId}?mode=permanent`),
      { params: Promise.resolve({ userId: employeeAId.toString() }) }
    );
    assert(
      resPermanentDelete.status === 400,
      "Permanent deletion is disabled by policy to maintain audit immutability (HTTP 400)"
    );
    const bodyPerm = await resPermanentDelete.json();
    assert(
      bodyPerm.message.includes("disabled in FinCore ERP"),
      "API explicitly explains ledger immutability and directs to safe deactivation"
    );

    // Verify user is still in DB
    const empStillExists = await UserModel.findById(employeeAId);
    assert(Boolean(empStillExists), "User record remains intact in database");

    // Test 14: User cannot deactivate self
    const resSelfDeactivate = await DELETE(
      makeRequest("DELETE", `http://localhost/api/admin/users/${superAdmin1Id}`),
      { params: Promise.resolve({ userId: superAdmin1Id.toString() }) }
    );
    assert(resSelfDeactivate.status === 400, "Users cannot deactivate their own account (HTTP 400)");

    console.log("\n--- PRIORITY 4: LAST ACTIVE SUPER ADMIN & CONCURRENCY PROTECTION ---");

    // Test 15 & 16: Last active Super Admin Protection
    // Isolate external DB super admins so only superAdmin1 & superAdmin2 are active
    const externalSuperAdmins = await UserModel.find({
      _id: { $nin: [superAdmin1Id, superAdmin2Id] },
      role: "super_admin",
      isActive: { $ne: false },
    }).select("_id").lean();
    otherSuperAdminIds = externalSuperAdmins.map((u) => u._id);

    if (otherSuperAdminIds.length > 0) {
      await UserModel.updateMany({ _id: { $in: otherSuperAdminIds } }, { $set: { isActive: false } });
    }

    // Ensure superAdmin1 & superAdmin2 are both active
    await UserModel.findByIdAndUpdate(superAdmin1Id, { isActive: true, role: "super_admin" });
    await UserModel.findByIdAndUpdate(superAdmin2Id, { isActive: true, role: "super_admin" });

    // Test 15: SuperAdmin 1 deactivates SuperAdmin 2 -> succeeds because SuperAdmin 1 remains
    __setTestSession({ user: { id: superAdmin1Id.toString(), role: "super_admin" } });
    const resDeactivateSuper2 = await DELETE(
      makeRequest("DELETE", `http://localhost/api/admin/users/${superAdmin2Id}`),
      { params: Promise.resolve({ userId: superAdmin2Id.toString() }) }
    );
    assert(
      resDeactivateSuper2.status === 200,
      "Super Admin 2 deactivation succeeds because Super Admin 1 remains active (HTTP 200)"
    );

    // Test 16: SuperAdmin 1 is now the SOLE active Super Admin in the entire database.
    // Attempting to demote SuperAdmin 1 to 'employee' is blocked
    const resDemoteSoleSuper = await PATCH(
      makeRequest("PATCH", `http://localhost/api/admin/users/${superAdmin1Id}`, { role: "employee" }),
      { params: Promise.resolve({ userId: superAdmin1Id.toString() }) }
    );
    assert(
      resDemoteSoleSuper.status === 400 || resDemoteSoleSuper.status === 403,
      "Demotion of the sole remaining Super Admin is blocked (HTTP 400/403)"
    );

    // Test 17: Concurrent Race Condition Test
    // Reactivate Super Admin 2 so exactly 2 exist
    await UserModel.findByIdAndUpdate(superAdmin2Id, { isActive: true, role: "super_admin" });

    __setTestSession({ user: { id: superAdmin1Id.toString(), role: "super_admin" } });
    const p1 = DELETE(
      makeRequest("DELETE", `http://localhost/api/admin/users/${superAdmin2Id}`),
      { params: Promise.resolve({ userId: superAdmin2Id.toString() }) }
    );

    // Concurrent request targeting Super Admin 1
    const p2 = DELETE(
      makeRequest("DELETE", `http://localhost/api/admin/users/${superAdmin1Id}`),
      { params: Promise.resolve({ userId: superAdmin1Id.toString() }) }
    );

    const [r1, r2] = await Promise.all([p1, p2]);

    // Check that both didn't succeed (one must fail or be blocked by self-action/mutex)
    const activeSuperAdminsRemaining = await UserModel.countDocuments({
      _id: { $in: [superAdmin1Id, superAdmin2Id] },
      role: "super_admin",
      isActive: { $ne: false },
    });
    assert(
      activeSuperAdminsRemaining >= 1,
      `Concurrency Invariant Preserved: ${activeSuperAdminsRemaining} Super Admin(s) remain active (never 0)`
    );

    console.log("\n--- PRIORITY 6: ERROR HANDLING & MALFORMED IDENTIFIERS ---");

    // Test 18: Malformed user ID (invalid ObjectId)
    const resMalformed = await PATCH(
      makeRequest("PATCH", `http://localhost/api/admin/users/not-a-valid-objectid`, { name: "Malformed" }),
      { params: Promise.resolve({ userId: "not-a-valid-objectid" }) }
    );
    assert(
      resMalformed.status === 400,
      "Malformed User ID returns HTTP 400 without internal crash"
    );

    // Test 19: Nonexistent user ID
    const nonExistentId = new mongoose.Types.ObjectId().toString();
    const resNonExistent = await PATCH(
      makeRequest("PATCH", `http://localhost/api/admin/users/${nonExistentId}`, { name: "Ghost" }),
      { params: Promise.resolve({ userId: nonExistentId }) }
    );
    assert(
      resNonExistent.status === 404,
      "Nonexistent User ID returns HTTP 404 Not Found"
    );

  } finally {
    // Cleanup test data
    __setTestSession(null);
    if (otherSuperAdminIds.length > 0) {
      await UserModel.updateMany({ _id: { $in: otherSuperAdminIds } }, { $set: { isActive: true } });
    }
    await UserModel.deleteMany({
      _id: { $in: [superAdmin1Id, superAdmin2Id, adminAId, adminBId, employeeAId, employeeBId] },
    });
    await CompanyModel.deleteMany({
      _id: { $in: [companyAId, companyBId] },
    });
    await mongoose.disconnect();
  }

  console.log("\n=======================================================================");
  console.log(`  REAL API REGRESSION TESTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=======================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runRealApiSecuritySuite().catch((err) => {
  console.error("Test execution failed with error:", err);
  process.exit(1);
});
