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
  // Ignore env read error
}

import { connectDB } from "../src/lib/db/connect";
import { TransferModel, AccountModel, AccountTransactionModel } from "../src/lib/db/models";

async function auditHistoricalTransactions() {
  console.log("=================================================================");
  console.log("   AUDIT: IDENTIFYING CORRUPTED OR TEST TRANSACTIONS IN DB      ");
  console.log("=================================================================\n");

  await connectDB();

  // 1. Search for pen-test or negative transfers
  const suspiciousTransfers = await TransferModel.find({
    $or: [
      { fromAmount: { $lte: 0 } },
      { toAmount: { $lte: 0 } },
      { reference: { $in: ["NEGTEST", "SECTEST"] } },
      { reference: { $regex: /test/i } },
      { note: { $regex: /test/i } },
    ]
  }).lean();

  console.log(`Found ${suspiciousTransfers.length} suspicious or pen-test transfers:`);
  for (const t of suspiciousTransfers) {
    console.log({
      id: String(t._id),
      fromAccountId: String(t.fromAccountId),
      toAccountId: String(t.toAccountId),
      fromAmount: t.fromAmount,
      toAmount: t.toAmount,
      exchangeRate: t.exchangeRate,
      reference: t.reference,
      createdAt: t.createdAt,
    });
  }

  // 2. Search for inverted or non-positive ledger entries
  const allTx = await AccountTransactionModel.find({}).lean();
  const corruptedTx = allTx.filter((tx) => {
    const amt = Number(tx.amount);
    const before = Number(tx.balanceBefore);
    const after = Number(tx.balanceAfter);
    if (amt <= 0) return true;
    if (tx.type === "DEBIT" && after >= before) return true;
    if (tx.type === "CREDIT" && after <= before) return true;
    return false;
  });

  console.log(`\nFound ${corruptedTx.length} corrupted ledger entries (amount <= 0 or inverted balance delta):`);
  for (const ctx of corruptedTx) {
    console.log({
      id: String(ctx._id),
      accountId: String(ctx.accountId),
      type: ctx.type,
      amount: ctx.amount,
      balanceBefore: ctx.balanceBefore,
      balanceAfter: ctx.balanceAfter,
      note: ctx.note,
      createdAt: ctx.createdAt,
    });
  }

  // 3. Inspect Account Balances
  const accounts = await AccountModel.find({}).select("name currency currentBalance openingBalance").lean();
  console.log(`\nCurrent Account Balances (${accounts.length} accounts):`);
  for (const acc of accounts) {
    console.log(`- ${acc.name} (${acc.currency}): currentBalance = ${acc.currentBalance}, opening = ${acc.openingBalance}`);
  }

  process.exit(0);
}

auditHistoricalTransactions().catch((err) => {
  console.error("Audit error:", err);
  process.exit(1);
});
