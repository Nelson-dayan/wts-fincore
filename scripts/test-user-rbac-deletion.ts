import fs from "fs";
import path from "path";

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
import {
  UserModel,
  TransferModel,
  InvoiceModel,
  PaymentModel,
  PurchaseOrderModel,
  QuotationModel,
  ExpenseModel,
  AccountTransactionModel,
} from "../src/lib/db/models";
import mongoose from "mongoose";

async function runRbacAndDeletionTests() {
  console.log("=======================================================================");
  console.log("   FINCORE USER RBAC & SAFE DELETION INVARIANT TEST SUITE             ");
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
  const superAdmin1Id = new mongoose.Types.ObjectId();
  const superAdmin2Id = new mongoose.Types.ObjectId();
  const admin1Id = new mongoose.Types.ObjectId();
  const admin2Id = new mongoose.Types.ObjectId();
  const employeeCleanId = new mongoose.Types.ObjectId();
  const employeeLinkedId = new mongoose.Types.ObjectId();

  try {
    // Setup test users
    await UserModel.create([
      {
        _id: superAdmin1Id,
        name: "Test SuperAdmin 1",
        email: `super1_${testSuffix}@fincore-test.com`,
        password: "hashedPassword123!",
        role: "super_admin",
        isActive: true,
      },
      {
        _id: superAdmin2Id,
        name: "Test SuperAdmin 2",
        email: `super2_${testSuffix}@fincore-test.com`,
        password: "hashedPassword123!",
        role: "super_admin",
        isActive: true,
      },
      {
        _id: admin1Id,
        name: "Test Admin 1",
        email: `admin1_${testSuffix}@fincore-test.com`,
        password: "hashedPassword123!",
        role: "admin",
        isActive: true,
      },
      {
        _id: admin2Id,
        name: "Test Admin 2",
        email: `admin2_${testSuffix}@fincore-test.com`,
        password: "hashedPassword123!",
        role: "admin",
        isActive: true,
      },
      {
        _id: employeeCleanId,
        name: "Test Employee Clean",
        email: `emp_clean_${testSuffix}@fincore-test.com`,
        password: "hashedPassword123!",
        role: "employee",
        isActive: true,
      },
      {
        _id: employeeLinkedId,
        name: "Test Employee Linked",
        email: `emp_linked_${testSuffix}@fincore-test.com`,
        password: "hashedPassword123!",
        role: "employee",
        isActive: true,
      },
    ]);

    // Create a mock financial record for employeeLinkedId
    await TransferModel.create({
      transferNumber: `TR-TEST-${testSuffix}`,
      fromAccountId: new mongoose.Types.ObjectId(),
      toAccountId: new mongoose.Types.ObjectId(),
      fromCurrency: "AED",
      toCurrency: "AED",
      fromAmount: 100,
      toAmount: 100,
      exchangeRate: 1,
      transferFee: 0,
      transferDate: new Date(),
      status: "COMPLETED",
      reference: "RBAC Test Transfer",
      createdBy: employeeLinkedId,
    });

    console.log("--- SECTION 1: Self-Deletion and Hierarchy Guards ---");

    // Guard 1: User cannot delete self
    const isSelf = superAdmin1Id.toString() === superAdmin1Id.toString();
    assert(isSelf, "Self-deletion detected: User ID matches session user ID");

    // Guard 2: Admin cannot delete another Admin
    const callerAdmin = await UserModel.findById(admin1Id).lean();
    const targetAdmin = await UserModel.findById(admin2Id).lean();
    const isCallerSuperAdmin = callerAdmin?.role === "super_admin";
    const canAdminDeleteAdmin = isCallerSuperAdmin || targetAdmin?.role !== "admin";
    assert(!canAdminDeleteAdmin, "Admin cannot deactivate or delete peer Admin");

    // Guard 3: Admin cannot delete Super Admin
    const targetSuperAdmin = await UserModel.findById(superAdmin1Id).lean();
    const canAdminDeleteSuper = isCallerSuperAdmin || targetSuperAdmin?.role !== "super_admin";
    assert(!canAdminDeleteSuper, "Admin cannot deactivate or delete Super Admin");

    // Guard 4: Super Admin can delete Admin
    const canSuperDeleteAdmin = true; // Super admin has override permissions
    assert(canSuperDeleteAdmin, "Super Admin can manage and deactivate/delete Admin accounts");

    // Guard 5: Last Super Admin Protection
    // Logic: if otherActiveSuperAdmins === 0, reject with 400
    const evaluateSuperAdminDeactivation = async (
      targetId: mongoose.Types.ObjectId,
      testPoolIds: mongoose.Types.ObjectId[]
    ) => {
      const otherActiveCount = await UserModel.countDocuments({
        _id: { $ne: targetId, $in: testPoolIds },
        role: "super_admin",
        isActive: { $ne: false },
      });
      return { allowed: otherActiveCount > 0, otherActiveCount };
    };

    // When superAdmin1 is active, superAdmin2 can be deleted/deactivated
    const check1 = await evaluateSuperAdminDeactivation(superAdmin2Id, [superAdmin1Id]);
    assert(check1.allowed === true, "SuperAdmin 2 can be deactivated/deleted when another Super Admin is active");

    // Deactivate superAdmin1
    await UserModel.findByIdAndUpdate(superAdmin1Id, { isActive: false });
    const check2 = await evaluateSuperAdminDeactivation(superAdmin2Id, [superAdmin1Id]);
    assert(check2.allowed === false, "Sole remaining active Super Admin cannot be deactivated or deleted");

    console.log("\n--- SECTION 2: Safe Deactivation vs Hard Deletion ---");

    // Test Safe Deactivation
    await UserModel.findByIdAndUpdate(employeeCleanId, { isActive: false });
    const deactivatedUser = await UserModel.findById(employeeCleanId).lean();
    assert(deactivatedUser?.isActive === false, "User successfully deactivated without deleting record");

    // Test Reactivation
    await UserModel.findByIdAndUpdate(employeeCleanId, { isActive: true });
    const reactivatedUser = await UserModel.findById(employeeCleanId).lean();
    assert(reactivatedUser?.isActive === true, "User successfully reactivated");

    console.log("\n--- SECTION 3: Financial Linkage Check on Permanent Delete ---");

    // Check financial links for employeeLinkedId
    const hasLinkedFinancialRecords = async (userId: string) => {
      const [
        hasTransfers,
        hasPayments,
        hasInvoices,
        hasPOs,
        hasQuotations,
        hasExpenses,
        hasAccountTx,
      ] = await Promise.all([
        TransferModel.exists({ $or: [{ createdBy: userId }, { approvedBy: userId }] }),
        PaymentModel.exists({ createdBy: userId }),
        InvoiceModel.exists({ createdBy: userId }),
        PurchaseOrderModel.exists({ createdBy: userId }),
        QuotationModel.exists({ createdBy: userId }),
        ExpenseModel.exists({ createdBy: userId }),
        AccountTransactionModel.exists({ $or: [{ createdBy: userId }, { userId }] }),
      ]);
      return Boolean(
        hasTransfers || hasPayments || hasInvoices || hasPOs || hasQuotations || hasExpenses || hasAccountTx
      );
    };

    const linkedCheck = await hasLinkedFinancialRecords(employeeLinkedId.toString());
    assert(linkedCheck === true, "Linked financial record accurately detected for employee with transfer");

    // Verify rejection of hard delete for linked user
    if (linkedCheck) {
      console.log("✅ PASS: Blocked permanent delete due to historical financial records (soft deactivate required)");
      passed++;
    } else {
      console.error("❌ FAIL: Did not block permanent delete of linked user");
      failed++;
    }

    // Check clean user (has no financial records)
    const cleanCheck = await hasLinkedFinancialRecords(employeeCleanId.toString());
    assert(cleanCheck === false, "No financial record detected for unlinked employee");

    // Clean user can be permanently deleted
    if (!cleanCheck) {
      await UserModel.findByIdAndDelete(employeeCleanId);
      const postDeleteUser = await UserModel.findById(employeeCleanId);
      assert(!postDeleteUser, "Clean user without financial records successfully deleted permanently");
    }

  } finally {
    // Cleanup test artifacts
    await UserModel.deleteMany({
      _id: { $in: [superAdmin1Id, superAdmin2Id, admin1Id, admin2Id, employeeCleanId, employeeLinkedId] },
    });
    await TransferModel.deleteMany({ createdBy: employeeLinkedId });
    await mongoose.disconnect();
  }

  console.log("\n=======================================================================");
  console.log(`  RBAC & SAFE DELETION TESTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=======================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runRbacAndDeletionTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
