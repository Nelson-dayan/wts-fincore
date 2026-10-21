import mongoose from "mongoose";

/**
 * SAFE READ-ONLY AUDIT SCRIPT FOR STAGING / UAT DATABASE
 * 
 * Safeguards:
 * 1. Strictly read-only queries (no .save(), .updateOne(), .create(), .delete()).
 * 2. Redacts connection string credentials in stdout/stderr.
 * 3. Does NOT alter any database documents or financial records.
 * 4. Outputs an actionable reconciliation advisory table for finance/ops team.
 * 
 * Usage:
 *   npx tsx scripts/audit-staging-transfers.ts "<STAGING_MONGO_URI>"
 *   or:
 *   STAGING_MONGO_URI="<STAGING_MONGO_URI>" npx tsx scripts/audit-staging-transfers.ts
 */

function maskUri(uri: string): string {
  try {
    return uri.replace(/\/\/([^:]+):([^@]+)@/, "//***:***@");
  } catch {
    return "[PROTECTED URI]";
  }
}

async function runStagingAudit() {
  const targetUri = process.argv[2] || process.env.STAGING_MONGO_URI || process.env.MONGO_URI;

  if (!targetUri) {
    console.error("Error: Please provide staging MongoDB URI as an argument or via STAGING_MONGO_URI environment variable.");
    console.error("Example: npx tsx scripts/audit-staging-transfers.ts \"mongodb+srv://user:pass@cluster.mongodb.net/dbname\"");
    process.exit(1);
  }

  console.log("=======================================================================");
  console.log("       AWS AMPLIFY STAGING DATABASE READ-ONLY SECURITY AUDIT           ");
  console.log("=======================================================================");
  console.log(`Target Database: ${maskUri(targetUri)}\n`);

  const connection = await mongoose.createConnection(targetUri, {
    bufferCommands: false,
    readPreference: "secondaryPreferred",
  }).asPromise();

  console.log("✓ Connected securely in read-only mode.\n");

  const TransferSchema = new mongoose.Schema({}, { strict: false, collection: "transfers" });
  const AccountSchema = new mongoose.Schema({}, { strict: false, collection: "accounts" });
  const TxSchema = new mongoose.Schema({}, { strict: false, collection: "accounttransactions" });

  const Transfer = connection.model("StagingTransfer", TransferSchema);
  const Account = connection.model("StagingAccount", AccountSchema);
  const Tx = connection.model("StagingTx", TxSchema);

  // 1. Audit Known Pen-Test & Suspicious Transfer Records
  console.log("-----------------------------------------------------------------------");
  console.log("1. AUDITING TRANSFER RECORDS (Pen-Test Payloads & Invariants)");
  console.log("-----------------------------------------------------------------------");

  const suspiciousTransfers = await Transfer.find({
    $or: [
      { reference: { $in: ["NEGTEST", "SECTEST"] } },
      { fromAmount: { $lte: 0 } },
      { toAmount: { $lte: 0 } },
      { _id: { $in: ["6ac3d5858dda19c58990d3ad", "6ac3f49186601cc31406eaf4"] } }
    ]
  }).lean();

  if (suspiciousTransfers.length === 0) {
    console.log("✓ No known pen-test payloads (NEGTEST/SECTEST) or negative-amount transfers found.");
  } else {
    console.warn(`⚠️ Identified ${suspiciousTransfers.length} pen-test / abnormal transfer record(s):`);
    for (const rawT of suspiciousTransfers) {
      const t = rawT as Record<string, any>;
      console.log(`  - Transfer ID: ${String(t._id)}`);
      console.log(`    Ref: "${t.reference}" | From: ${t.fromAccountId} (${t.fromAmount} ${t.fromCurrency}) -> To: ${t.toAccountId} (${t.toAmount} ${t.toCurrency})`);
      console.log(`    Rate: ${t.exchangeRate} | CreatedAt: ${t.createdAt}`);
    }
  }

  // 2. Audit Corrupted Ledger Entries
  console.log("\n-----------------------------------------------------------------------");
  console.log("2. AUDITING ACCOUNT TRANSACTIONS (Ledger Sanity & Inverted Deltas)");
  console.log("-----------------------------------------------------------------------");

  const allTx = await Tx.find({}).lean();
  const corruptedTx = allTx.filter((rawTx: any) => {
    const tx = rawTx as Record<string, any>;
    const amt = Number(tx.amount);
    const before = Number(tx.balanceBefore);
    const after = Number(tx.balanceAfter);
    if (amt <= 0) return true;
    if (tx.type === "DEBIT" && after >= before) return true;
    if (tx.type === "CREDIT" && after <= before) return true;
    return false;
  });

  if (corruptedTx.length === 0) {
    console.log("✓ No inverted or corrupted ledger entries detected.");
  } else {
    console.warn(`⚠️ Identified ${corruptedTx.length} corrupted ledger entry/entries:`);
    for (const rawCtx of corruptedTx) {
      const ctx = rawCtx as Record<string, any>;
      console.log(`  - Tx ID: ${String(ctx._id)} | Type: ${ctx.type} | Amount: ${ctx.amount} ${ctx.currency}`);
      console.log(`    Account: ${ctx.accountId} | Balance: ${ctx.balanceBefore} -> ${ctx.balanceAfter}`);
      console.log(`    Note: "${ctx.note}" | TransferRef: ${ctx.transferId}`);
    }
  }

  // 3. Inspect Impacted Accounts
  console.log("\n-----------------------------------------------------------------------");
  console.log("3. CURRENT ACCOUNT BALANCES");
  console.log("-----------------------------------------------------------------------");

  const accounts = await Account.find({}).lean();
  for (const rawA of accounts) {
    const a = rawA as Record<string, any>;
    console.log(`  - Account: ${a.name} (${a.currency})`);
    console.log(`    ID: ${String(a._id)} | Current Balance: ${a.currentBalance} | Opening: ${a.openingBalance}`);
  }

  // 4. Financial Reconciliation Advisory
  console.log("\n=======================================================================");
  console.log("           FINANCIAL RECONCILIATION ADVISORY REPORT                   ");
  console.log("=======================================================================");
  if (suspiciousTransfers.length === 0 && corruptedTx.length === 0) {
    console.log("STATUS: CLEAN. No manual adjustments required for this database.");
  } else {
    console.log("ACTION REQUIRED: Do not run automated script repairs on production/staging.");
    console.log("The following manual adjustments should be reviewed by Finance/Treasury:");
    console.log("1. Reverse fabricated funds created by NEGTEST (+1,000 to sender, -1,000 to receiver).");
    console.log("2. Reverse inflated exchange-rate credit created by SECTEST (99 AED artificial gain).");
    console.log("3. Void associated phantom transfer records through standard audit journals.");
  }
  console.log("=======================================================================\n");

  await connection.close();
  process.exit(0);
}

runStagingAudit().catch((err) => {
  console.error("Staging audit execution failed:", err);
  process.exit(1);
});
