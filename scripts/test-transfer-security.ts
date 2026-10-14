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

import { recordTransfer, approveTransfer, rejectTransfer, getCurrencyDecimals } from "../src/lib/services/finance/transfer.service";
import * as accountEngine from "../src/lib/services/finance/account.engine";
import { connectDB } from "../src/lib/db/connect";
import { AccountModel, TransferModel, AccountTransactionModel, CompanyModel } from "../src/lib/db/models";
import mongoose from "mongoose";

async function runComprehensiveTransferSecurityTests() {
  console.log("=======================================================================");
  console.log("  FINANCIAL TRANSFER DEEP VERIFICATION & INVARIANT REGRESSION SUITE   ");
  console.log("  Verifying Penetration-Test Findings #01 & #02 Remediation Quality   ");
  console.log("=======================================================================\n");

  let passed = 0;
  let failed = 0;

  async function assertThrows(description: string, fn: () => Promise<any> | any, expectedMessageSubstr: string) {
    try {
      const res = fn();
      if (res && typeof res.then === "function") {
        await res;
      }
      console.error(`❌ FAIL: ${description} (Expected error containing "${expectedMessageSubstr}", but succeeded)`);
      failed++;
    } catch (err: any) {
      if (err?.message?.includes(expectedMessageSubstr)) {
        console.log(`✅ PASS: ${description} -> Caught: "${err.message}"`);
        passed++;
      } else {
        console.error(`❌ FAIL: ${description} -> Message mismatch. Got: "${err?.message}", Expected: "${expectedMessageSubstr}"`);
        failed++;
      }
    }
  }

  function assertTrue(description: string, condition: boolean) {
    if (condition) {
      console.log(`✅ PASS: ${description}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${description}`);
      failed++;
    }
  }

  // -------------------------------------------------------------
  // SECTION 1: MALFORMED NUMBERS & VALUE OBJECT VALIDATION
  // -------------------------------------------------------------
  console.log("--- SECTION 1: Malformed Numbers & Value Validation ---");

  await assertThrows(
    "Reject NaN fromAmount",
    () => recordTransfer({
      fromAccountId: "6a7af096bfb7b01601206f86",
      toAccountId: "6ac3d5858dda19c58990d3ac",
      fromAmount: NaN,
      toAmount: 100,
      exchangeRate: 1,
      createdBy: "user1"
    }),
    "must be greater than zero"
  );

  await assertThrows(
    "Reject Infinity fromAmount",
    () => recordTransfer({
      fromAccountId: "6a7af096bfb7b01601206f86",
      toAccountId: "6ac3d5858dda19c58990d3ac",
      fromAmount: Infinity,
      toAmount: 100,
      exchangeRate: 1,
      createdBy: "user1"
    }),
    "must be greater than zero"
  );

  await assertThrows(
    "Reject -Infinity fromAmount",
    () => recordTransfer({
      fromAccountId: "6a7af096bfb7b01601206f86",
      toAccountId: "6ac3d5858dda19c58990d3ac",
      fromAmount: -Infinity,
      toAmount: 100,
      exchangeRate: 1,
      createdBy: "user1"
    }),
    "must be greater than zero"
  );

  await assertThrows(
    "Reject non-numeric string parsed as NaN",
    () => recordTransfer({
      fromAccountId: "6a7af096bfb7b01601206f86",
      toAccountId: "6ac3d5858dda19c58990d3ac",
      fromAmount: "abc" as any,
      toAmount: 100,
      exchangeRate: 1,
      createdBy: "user1"
    }),
    "must be greater than zero"
  );

  await assertThrows(
    "Reject excessive number exceeding upper bounds (1e13)",
    () => recordTransfer({
      fromAccountId: "6a7af096bfb7b01601206f86",
      toAccountId: "6ac3d5858dda19c58990d3ac",
      fromAmount: 1e13,
      toAmount: 1e13,
      exchangeRate: 1,
      createdBy: "user1"
    }),
    "exceed maximum allowable system bounds"
  );

  // -------------------------------------------------------------
  // SECTION 2: FINDING #01 (NEGATIVE & ZERO VALUES)
  // -------------------------------------------------------------
  console.log("\n--- SECTION 2: Finding #01 (Negative & Zero Values) ---");

  await assertThrows(
    "Reject negative fromAmount (-1000)",
    () => recordTransfer({
      fromAccountId: "6a7af096bfb7b01601206f86",
      toAccountId: "6ac3d5858dda19c58990d3ac",
      fromAmount: -1000,
      toAmount: -1000,
      exchangeRate: 1,
      createdBy: "user1"
    }),
    "must be greater than zero"
  );

  await assertThrows(
    "Reject zero fromAmount (0)",
    () => recordTransfer({
      fromAccountId: "6a7af096bfb7b01601206f86",
      toAccountId: "6ac3d5858dda19c58990d3ac",
      fromAmount: 0,
      toAmount: 0,
      exchangeRate: 1,
      createdBy: "user1"
    }),
    "must be greater than zero"
  );

  await assertThrows(
    "Reject negative toAmount (-500)",
    () => recordTransfer({
      fromAccountId: "6a7af096bfb7b01601206f86",
      toAccountId: "6ac3d5858dda19c58990d3ac",
      fromAmount: 500,
      toAmount: -500,
      exchangeRate: 1,
      createdBy: "user1"
    }),
    "must be greater than zero"
  );

  await assertThrows(
    "Reject zero toAmount (0)",
    () => recordTransfer({
      fromAccountId: "6a7af096bfb7b01601206f86",
      toAccountId: "6ac3d5858dda19c58990d3ac",
      fromAmount: 500,
      toAmount: 0,
      exchangeRate: 1,
      createdBy: "user1"
    }),
    "must be greater than zero"
  );

  await assertThrows(
    "Reject negative exchangeRate (-1.5)",
    () => recordTransfer({
      fromAccountId: "6a7af096bfb7b01601206f86",
      toAccountId: "6ac3d5858dda19c58990d3ac",
      fromAmount: 100,
      toAmount: 100,
      exchangeRate: -1.5,
      createdBy: "user1"
    }),
    "must be greater than zero"
  );

  await assertThrows(
    "Reject negative fees (-25)",
    () => recordTransfer({
      fromAccountId: "6a7af096bfb7b01601206f86",
      toAccountId: "6ac3d5858dda19c58990d3ac",
      fromAmount: 100,
      toAmount: 100,
      exchangeRate: 1,
      fees: -25,
      createdBy: "user1"
    }),
    "cannot be negative"
  );

  // -------------------------------------------------------------
  // SECTION 3: CURRENCY PRECISION & ROUNDING HELPERS
  // -------------------------------------------------------------
  console.log("\n--- SECTION 3: Currency Precision & Decimals ---");
  assertTrue("USD uses 2 decimals", getCurrencyDecimals("USD") === 2);
  assertTrue("AED uses 2 decimals", getCurrencyDecimals("AED") === 2);
  assertTrue("INR uses 2 decimals", getCurrencyDecimals("INR") === 2);
  assertTrue("AUD uses 2 decimals", getCurrencyDecimals("AUD") === 2);
  assertTrue("BHD uses 3 decimals", getCurrencyDecimals("BHD") === 3);
  assertTrue("KWD uses 3 decimals", getCurrencyDecimals("KWD") === 3);
  assertTrue("JPY uses 0 decimals", getCurrencyDecimals("JPY") === 0);

  // -------------------------------------------------------------
  // SECTION 4: CORE LEDGER SANITY INVARIANTS (account.engine.ts)
  // -------------------------------------------------------------
  console.log("\n--- SECTION 4: Core Ledger Invariants ---");

  await assertThrows(
    "accountEngine.deposit rejects negative amount (-100)",
    () => (accountEngine as any).deposit("acc1", -100, undefined, "user1", null as any),
    "must be a positive number greater than zero"
  );

  await assertThrows(
    "accountEngine.deposit rejects zero amount (0)",
    () => (accountEngine as any).deposit("acc1", 0, undefined, "user1", null as any),
    "must be a positive number greater than zero"
  );

  await assertThrows(
    "accountEngine.withdraw rejects negative amount (-100)",
    () => (accountEngine as any).withdraw("acc1", -100, undefined, "user1", null as any),
    "must be a positive number greater than zero"
  );

  await assertThrows(
    "accountEngine.withdraw rejects zero amount (0)",
    () => (accountEngine as any).withdraw("acc1", 0, undefined, "user1", null as any),
    "must be a positive number greater than zero"
  );

  // -------------------------------------------------------------
  // SECTION 5: DATABASE-BACKED INTEGRATION TESTS (WITH REPLICA SET TRANSACTION)
  // -------------------------------------------------------------
  console.log("\n--- SECTION 5: Database-Backed Atomic & Security Tests ---");

  await connectDB();

  // Create isolated test company and accounts
  const company = await CompanyModel.findOne({ isPrimary: true });
  const companyId = company ? company._id : new mongoose.Types.ObjectId();
  const testUserId = new mongoose.Types.ObjectId();

  const accAed1 = await AccountModel.create({
    name: "TEST_AED_1",
    currency: "AED",
    type: "BANK",
    openingBalance: 10000,
    currentBalance: 10000,
    companyId,
    createdBy: testUserId,
    isActive: true,
  });

  const accAed2 = await AccountModel.create({
    name: "TEST_AED_2",
    currency: "AED",
    type: "BANK",
    openingBalance: 5000,
    currentBalance: 5000,
    companyId,
    createdBy: testUserId,
    isActive: true,
  });

  const accUsd = await AccountModel.create({
    name: "TEST_USD_1",
    currency: "USD",
    type: "BANK",
    openingBalance: 5000,
    currentBalance: 5000,
    companyId,
    createdBy: testUserId,
    isActive: true,
  });

  const accAud = await AccountModel.create({
    name: "TEST_AUD_1",
    currency: "AUD",
    type: "BANK",
    openingBalance: 5000,
    currentBalance: 5000,
    companyId,
    createdBy: testUserId,
    isActive: true,
  });

  const inactiveAcc = await AccountModel.create({
    name: "TEST_INACTIVE",
    currency: "AED",
    type: "BANK",
    openingBalance: 1000,
    currentBalance: 1000,
    companyId,
    createdBy: testUserId,
    isActive: false,
  });

  try {
    // Test 5.1: Same source and destination account ID
    await assertThrows(
      "Reject transfer between same account",
      () => recordTransfer({
        fromAccountId: accAed1._id,
        toAccountId: accAed1._id,
        fromAmount: 100,
        toAmount: 100,
        exchangeRate: 1,
        createdBy: testUserId,
      }),
      "must be different"
    );

    // Test 5.2: Inactive account transfer
    await assertThrows(
      "Reject transfer involving inactive source account",
      () => recordTransfer({
        fromAccountId: inactiveAcc._id,
        toAccountId: accAed2._id,
        fromAmount: 100,
        toAmount: 100,
        exchangeRate: 1,
        createdBy: testUserId,
      }),
      "is inactive"
    );

    // Test 5.3: Finding #02: Same-currency transfer rate manipulation bypass attempt
    // Attacker sets exchangeRate: 5 to create 400 AED out of 100 AED
    await assertThrows(
      "Finding #02 Bypass Attempt: Reject same-currency exchangeRate != 1.0 (AED -> AED at rate 5)",
      () => recordTransfer({
        fromAccountId: accAed1._id,
        toAccountId: accAed2._id,
        fromAmount: 100,
        toAmount: 500,
        exchangeRate: 5,
        createdBy: testUserId,
      }),
      "Same-currency transfers (AED -> AED) must have an exchange rate of 1.0"
    );

    // Test 5.4: Same-currency transfer amount mismatch
    await assertThrows(
      "Finding #02 Bypass Attempt: Reject same-currency toAmount != fromAmount (100 -> 105 at rate 1)",
      () => recordTransfer({
        fromAccountId: accAed1._id,
        toAccountId: accAed2._id,
        fromAmount: 100,
        toAmount: 105,
        exchangeRate: 1,
        createdBy: testUserId,
      }),
      "must have identical source and destination amounts"
    );

    // Test 5.5: Cross-currency astronomical rate manipulation bypass attempt
    // Attacker sends 1 AUD -> 1000000 AED at rate 1000000
    await assertThrows(
      "Finding #02 Bypass Attempt: Reject astronomical cross-currency rate (1 AUD -> 1000000 AED at rate 1000000)",
      () => recordTransfer({
        fromAccountId: accAud._id,
        toAccountId: accAed1._id,
        fromAmount: 1,
        toAmount: 1000000,
        exchangeRate: 1000000,
        createdBy: testUserId,
      }),
      "outside allowable system thresholds"
    );

    // Test 5.6: Cross-currency excessive deviation from market benchmark (~2.41)
    await assertThrows(
      "Finding #02 Bypass Attempt: Reject 20x market deviation rate (AUD -> AED at rate 50)",
      () => recordTransfer({
        fromAccountId: accAud._id,
        toAccountId: accAed1._id,
        fromAmount: 100,
        toAmount: 5000,
        exchangeRate: 50,
        createdBy: testUserId,
      }),
      "deviates excessively from market benchmark"
    );

    // Test 5.7: Cross-currency rate / toAmount mathematical mismatch
    await assertThrows(
      "Finding #02: Reject toAmount mismatch against fromAmount * rate (100 AUD * 2.41 != 350 AED)",
      () => recordTransfer({
        fromAccountId: accAud._id,
        toAccountId: accAed1._id,
        fromAmount: 100,
        toAmount: 350,
        exchangeRate: 2.41,
        createdBy: testUserId,
      }),
      "does not match exchange rate calculation"
    );

    // Test 5.8: Valid Same-Currency Transfer (Atomic Ledger Execution)
    console.log("\n--- Executing Valid Same-Currency Transfer ---");
    const balBefore1 = (await AccountModel.findById(accAed1._id))!.currentBalance;
    const balBefore2 = (await AccountModel.findById(accAed2._id))!.currentBalance;

    const sameCurrencyResult = await recordTransfer({
      fromAccountId: accAed1._id,
      toAccountId: accAed2._id,
      fromAmount: 250.50,
      toAmount: 250.50,
      exchangeRate: 1.0,
      fees: 0,
      reference: "SAME_CCY_OK",
      note: "Internal reallocation",
      createdBy: testUserId,
    });

    assertTrue("Valid same-currency transfer succeeded", sameCurrencyResult.success === true);
    const balAfter1 = (await AccountModel.findById(accAed1._id))!.currentBalance;
    const balAfter2 = (await AccountModel.findById(accAed2._id))!.currentBalance;

    assertTrue(
      "Source account correctly debited by exactly 250.50",
      Math.abs((balBefore1 as number) - 250.50 - (balAfter1 as number)) < 0.001
    );
    assertTrue(
      "Destination account correctly credited by exactly 250.50",
      Math.abs((balBefore2 as number) + 250.50 - (balAfter2 as number)) < 0.001
    );

    // Check transaction records
    const txRecords = await AccountTransactionModel.find({ transferId: sameCurrencyResult.transferId });
    assertTrue("Exactly 2 ledger entries created (1 DEBIT, 1 CREDIT)", txRecords.length === 2);
    const debitTx = txRecords.find(t => t.type === "DEBIT");
    const creditTx = txRecords.find(t => t.type === "CREDIT");
    assertTrue("DEBIT balanceAfter < balanceBefore", (debitTx!.balanceAfter as number) < (debitTx!.balanceBefore as number));
    assertTrue("CREDIT balanceAfter > balanceBefore", (creditTx!.balanceAfter as number) > (creditTx!.balanceBefore as number));

    // Test 5.9: Valid Cross-Currency Transfer with Commercial Bank Rate & Rounding
    console.log("\n--- Executing Valid Cross-Currency Transfer ---");
    // AUD -> AED: Benchmark is ~2.4115. Let's use bank rate 2.45
    // fromAmount: 100 AUD, toAmount: 245.00 AED
    const audBefore = (await AccountModel.findById(accAud._id))!.currentBalance;
    const aedBefore = (await AccountModel.findById(accAed1._id))!.currentBalance;

    const crossResult = await recordTransfer({
      fromAccountId: accAud._id,
      toAccountId: accAed1._id,
      fromAmount: 100,
      toAmount: 245.00,
      exchangeRate: 2.45,
      fees: 15.00, // $15 wire fee recorded
      reference: "AUD_AED_FX_01",
      createdBy: testUserId,
    });

    assertTrue("Valid cross-currency transfer succeeded", crossResult.success === true);
    const audAfter = (await AccountModel.findById(accAud._id))!.currentBalance;
    const aedAfter = (await AccountModel.findById(accAed1._id))!.currentBalance;

    assertTrue(
      "AUD source debited by 100 AUD",
      Math.abs((audBefore as number) - 100 - (audAfter as number)) < 0.001
    );
    assertTrue(
      "AED destination credited by 245 AED",
      Math.abs((aedBefore as number) + 245 - (aedAfter as number)) < 0.001
    );

    // Test 5.10: Atomic Rollback on Failure Verification
    console.log("\n--- Verifying Atomic Rollback on Failure ---");
    const testAudPreRollback = (await AccountModel.findById(accAud._id))!.currentBalance;
    const testAedPreRollback = (await AccountModel.findById(accAed1._id))!.currentBalance;
    const transfersCountBefore = await TransferModel.countDocuments();

    // Trigger an error during execution by passing an invalid destination ID that doesn't exist
    await assertThrows(
      "Non-existent destination aborts cleanly without partial debit",
      () => recordTransfer({
        fromAccountId: accAud._id,
        toAccountId: new mongoose.Types.ObjectId(), // non-existent
        fromAmount: 50,
        toAmount: 122.5,
        exchangeRate: 2.45,
        createdBy: testUserId,
      }),
      "Destination account not found"
    );

    const testAudPostRollback = (await AccountModel.findById(accAud._id))!.currentBalance;
    const testAedPostRollback = (await AccountModel.findById(accAed1._id))!.currentBalance;
    const transfersCountAfter = await TransferModel.countDocuments();

    assertTrue(
      "Source account balance unchanged after aborted transfer",
      (testAudPreRollback as number) === (testAudPostRollback as number)
    );
    assertTrue(
      "Destination account balance unchanged after aborted transfer",
      (testAedPreRollback as number) === (testAedPostRollback as number)
    );
    assertTrue(
      "No phantom transfer record created in database",
      transfersCountBefore === transfersCountAfter
    );

    // Test 5.11: Concurrent Transfers Execution & Ledger Consistency
    console.log("\n--- Testing Concurrent Transfers & Concurrency Consistency ---");
    const accConcA = await AccountModel.create({
      name: "TEST_CONC_A",
      currency: "AED",
      type: "BANK",
      openingBalance: 1000,
      currentBalance: 1000,
      companyId,
      createdBy: testUserId,
      isActive: true,
    });
    const accConcB = await AccountModel.create({
      name: "TEST_CONC_B",
      currency: "AED",
      type: "BANK",
      openingBalance: 500,
      currentBalance: 500,
      companyId,
      createdBy: testUserId,
      isActive: true,
    });

    const concurrentAmount = 25.00;
    const concurrentIterations = 4;
    const concurrentPromises = [];

    for (let i = 0; i < concurrentIterations; i++) {
      concurrentPromises.push(
        recordTransfer({
          fromAccountId: accConcA._id,
          toAccountId: accConcB._id,
          fromAmount: concurrentAmount,
          toAmount: concurrentAmount,
          exchangeRate: 1.0,
          fees: 0,
          reference: `CONC_TXN_${i}`,
          note: `Concurrent test ${i}`,
          createdBy: testUserId,
        })
      );
    }

    const concurrentResults = await Promise.all(concurrentPromises);
    assertTrue("All 4 concurrent transfers succeeded", concurrentResults.every(r => r.success === true));

    const finalConcA = (await AccountModel.findById(accConcA._id))!.currentBalance;
    const finalConcB = (await AccountModel.findById(accConcB._id))!.currentBalance;

    const expectedFinalA = 1000 - (concurrentAmount * concurrentIterations); // 900
    const expectedFinalB = 500 + (concurrentAmount * concurrentIterations);  // 600

    assertTrue(
      `Source balance accurately debited across concurrent writes (expected: ${expectedFinalA}, got: ${finalConcA})`,
      Math.abs((finalConcA as number) - expectedFinalA) < 0.001
    );
    assertTrue(
      `Destination balance accurately credited across concurrent writes (expected: ${expectedFinalB}, got: ${finalConcB})`,
      Math.abs((finalConcB as number) - expectedFinalB) < 0.001
    );

    const concTxRecords = await AccountTransactionModel.find({
      accountId: { $in: [accConcA._id, accConcB._id] }
    });
    assertTrue(
      `Exactly ${concurrentIterations * 2} ledger transactions written for concurrent transfers`,
      concTxRecords.length === concurrentIterations * 2
    );

    // Clean up concurrent test accounts
    await AccountModel.deleteMany({ _id: { $in: [accConcA._id, accConcB._id] } });

    // -------------------------------------------------------------
    // SECTION 6: FOREX OVERRIDE POLICY, AUDIT TRAIL & APPROVALS
    // -------------------------------------------------------------
    console.log("\n--- SECTION 6: Forex Override Policy, Audit Trail & Approvals ---");

    // Test 6.1: Material deviation (>10% and <=25%) requires overrideReason
    // Benchmark AUD -> AED: 54.5 / 22.6 = ~2.4115. Rate 2.8 is ~16.1% deviation.
    await assertThrows(
      "Reject >10% rate deviation without overrideReason",
      () => recordTransfer({
        fromAccountId: accAud._id,
        toAccountId: accAed1._id,
        fromAmount: 100,
        toAmount: 280,
        exchangeRate: 2.8,
        createdBy: testUserId,
      }),
      "A documented override reason (minimum 5 characters) is required"
    );

    // Test 6.2: Material deviation with overrideReason completes immediately with audit trail
    const tieredTransfer = await recordTransfer({
      fromAccountId: accAud._id,
      toAccountId: accAed1._id,
      fromAmount: 100,
      toAmount: 280,
      exchangeRate: 2.8,
      overrideReason: "Bank spot quote ref #FX-4912",
      reference: "SPOT_WIRE_4912",
      createdBy: testUserId,
    });
    assertTrue("Material deviation with overrideReason completed successfully", tieredTransfer.status === "COMPLETED");

    const tieredDoc = await TransferModel.findById(tieredTransfer.transferId);
    assertTrue("Audit trail recorded rateSource as MANUAL_OVERRIDE", tieredDoc?.rateSource === "MANUAL_OVERRIDE");
    assertTrue("Audit trail recorded benchmarkRate", (tieredDoc?.benchmarkRate || 0) > 2.4);
    assertTrue("Audit trail recorded rateDeviationPercent (>10%)", (tieredDoc?.rateDeviationPercent || 0) > 15);
    assertTrue("Audit trail recorded overrideReason", tieredDoc?.overrideReason === "Bank spot quote ref #FX-4912");

    // Test 6.3: High deviation (>25%) queues as PENDING_APPROVAL with ZERO balance change
    // Rate 3.2 is ~32.7% deviation.
    const audBalanceBeforePending = (await AccountModel.findById(accAud._id))!.currentBalance;
    const aedBalanceBeforePending = (await AccountModel.findById(accAed1._id))!.currentBalance;
    const txCountBeforePending = await AccountTransactionModel.countDocuments();

    const pendingTransferResult = await recordTransfer({
      fromAccountId: accAud._id,
      toAccountId: accAed1._id,
      fromAmount: 100,
      toAmount: 320,
      exchangeRate: 3.2,
      overrideReason: "Special board-approved currency hedging exchange",
      reference: "HEDGE_OP_8821",
      createdBy: testUserId,
    });

    assertTrue("Transfer with >25% deviation queued with status PENDING_APPROVAL", pendingTransferResult.status === "PENDING_APPROVAL");
    assertTrue("Transfer result indicates requiresApproval === true", pendingTransferResult.requiresApproval === true);

    const audBalanceAfterPending = (await AccountModel.findById(accAud._id))!.currentBalance;
    const aedBalanceAfterPending = (await AccountModel.findById(accAed1._id))!.currentBalance;
    const txCountAfterPending = await AccountTransactionModel.countDocuments();

    assertTrue(
      "SERVER-SIDE INVARIANT: Source account balance completely untouched by unapproved transfer",
      (audBalanceBeforePending as number) === (audBalanceAfterPending as number)
    );
    assertTrue(
      "SERVER-SIDE INVARIANT: Destination account balance completely untouched by unapproved transfer",
      (aedBalanceBeforePending as number) === (aedBalanceAfterPending as number)
    );
    assertTrue(
      "SERVER-SIDE INVARIANT: Zero ledger entries written for unapproved transfer",
      txCountBeforePending === txCountAfterPending
    );

    // Test 6.4: Dual-Control Maker-Checker constraint: creator cannot self-approve
    await assertThrows(
      "Maker-Checker: Reject self-approval by transfer creator",
      () => approveTransfer({
        transferId: pendingTransferResult.transferId,
        approverId: testUserId,
      }),
      "Maker-checker violation: Transfer creator cannot approve their own transfer"
    );

    // Test 6.5: Legitimate approval by second admin executes atomically
    const secondAdminId = new mongoose.Types.ObjectId();
    const approvalResult = await approveTransfer({
      transferId: pendingTransferResult.transferId,
      approverId: secondAdminId,
    });
    assertTrue("Second admin approval succeeded", approvalResult.status === "COMPLETED");

    const audBalanceAfterApproval = (await AccountModel.findById(accAud._id))!.currentBalance;
    const aedBalanceAfterApproval = (await AccountModel.findById(accAed1._id))!.currentBalance;

    assertTrue(
      "Source account debited 100 AUD upon approval",
      (audBalanceAfterPending as number) - (audBalanceAfterApproval as number) === 100
    );
    assertTrue(
      "Destination account credited 320 AED upon approval",
      (aedBalanceAfterApproval as number) - (aedBalanceAfterPending as number) === 320
    );

    const approvedTransferDoc = await TransferModel.findById(pendingTransferResult.transferId);
    assertTrue("Approved transfer status updated to COMPLETED", approvedTransferDoc?.status === "COMPLETED");
    assertTrue("Approved transfer records approvedBy second admin", String(approvedTransferDoc?.approvedBy) === String(secondAdminId));
    assertTrue("Approved transfer records approvedAt timestamp", approvedTransferDoc?.approvedAt instanceof Date);

    // Test 6.6: Reject unapproved transfer
    const pendingTransferToReject = await recordTransfer({
      fromAccountId: accAud._id,
      toAccountId: accAed1._id,
      fromAmount: 50,
      toAmount: 160,
      exchangeRate: 3.2,
      overrideReason: "Another high deviation transfer to test rejection",
      createdBy: testUserId,
    });

    const audBalBeforeReject = (await AccountModel.findById(accAud._id))!.currentBalance;
    const rejectResult = await rejectTransfer({
      transferId: pendingTransferToReject.transferId,
      rejecterId: secondAdminId,
      reason: "Rate spread unacceptable by Risk & Treasury committee",
    });

    assertTrue("Transfer rejected successfully", rejectResult.status === "REJECTED");
    const rejectedDoc = await TransferModel.findById(pendingTransferToReject.transferId);
    assertTrue("Rejected transfer status in DB is REJECTED", rejectedDoc?.status === "REJECTED");
    assertTrue("Rejected note appended to transfer", rejectedDoc?.note?.includes("Risk & Treasury"));

    const audBalAfterReject = (await AccountModel.findById(accAud._id))!.currentBalance;
    assertTrue("Rejected transfer produced zero balance movement", (audBalBeforeReject as number) === (audBalAfterReject as number));

  } finally {
    // Clean up test records
    await AccountModel.deleteMany({ _id: { $in: [accAed1._id, accAed2._id, accUsd._id, accAud._id, inactiveAcc._id] } });
    await TransferModel.deleteMany({ createdBy: testUserId });
    await AccountTransactionModel.deleteMany({ createdBy: testUserId });
  }

  console.log("\n=======================================================================");
  console.log(`  COMPREHENSIVE TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=======================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runComprehensiveTransferSecurityTests().catch((err) => {
  console.error("Fatal test suite error:", err);
  process.exit(1);
});
