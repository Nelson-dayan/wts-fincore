import { ClientSession, Types } from "mongoose";
import { AccountModel, AccountTransactionModel } from "@/lib/db/models";
import { decimalToNumber } from "@/lib/services/business/money";

/**
 * Atomic deposit into an account with transaction logging.
 */
export async function deposit(
  accountId: string | Types.ObjectId,
  amount: number | string,
  paymentId: string | Types.ObjectId | undefined,
  createdBy: string | Types.ObjectId,
  session: ClientSession,
  note: string = "",
  transferId?: string | Types.ObjectId
) {
  const numAmount = Number(amount);
  if (!Number.isFinite(numAmount) || numAmount <= 0) {
    throw new Error("Deposit amount must be a positive number greater than zero");
  }

  const account = await AccountModel.findById(accountId).session(session);
  if (!account) throw new Error("Account not found");

  const balanceBefore = decimalToNumber(account.currentBalance);
  
  // Update Account Balance
  await AccountModel.updateOne(
    { _id: accountId },
    { $inc: { currentBalance: numAmount } },
    { session }
  );

  const updatedAccount = await AccountModel.findById(accountId).session(session);
  if (!updatedAccount) throw new Error("Account not found after update");
  
  const balanceAfter = decimalToNumber(updatedAccount.currentBalance);

  // Finding #01 Mitigation: Ledger sanity check (CREDIT must increase balance)
  if (balanceAfter <= balanceBefore) {
    throw new Error("Ledger sanity check failed: CREDIT transaction must increase account balance");
  }

  // Record Transaction
  await AccountTransactionModel.create([
    {
      accountId,
      paymentId,
      transferId,
      type: "CREDIT",
      amount: numAmount,
      currency: account.currency,
      balanceBefore,
      balanceAfter,
      note,
      createdBy,
    },
  ], { session });

  return updatedAccount;
}

/**
 * Atomic withdrawal from an account with transaction logging.
 */
export async function withdraw(
  accountId: string | Types.ObjectId,
  amount: number | string,
  paymentId: string | Types.ObjectId | undefined,
  createdBy: string | Types.ObjectId,
  session: ClientSession,
  note: string = "",
  transferId?: string | Types.ObjectId
) {
  const numAmount = Number(amount);
  if (!Number.isFinite(numAmount) || numAmount <= 0) {
    throw new Error("Withdrawal amount must be a positive number greater than zero");
  }

  const account = await AccountModel.findById(accountId).session(session);
  if (!account) throw new Error("Account not found");

  const balanceBefore = decimalToNumber(account.currentBalance);
  
  // Update Account Balance (Negative increment for withdrawal)
  await AccountModel.updateOne(
    { _id: accountId },
    { $inc: { currentBalance: -numAmount } },
    { session }
  );

  const updatedAccount = await AccountModel.findById(accountId).session(session);
  if (!updatedAccount) throw new Error("Account not found after update");
  
  const balanceAfter = decimalToNumber(updatedAccount.currentBalance);

  // Finding #01 Mitigation: Ledger sanity check (DEBIT must decrease balance)
  if (balanceAfter >= balanceBefore) {
    throw new Error("Ledger sanity check failed: DEBIT transaction must decrease account balance");
  }

  // Record Transaction
  await AccountTransactionModel.create([
    {
      accountId,
      paymentId,
      transferId,
      type: "DEBIT",
      amount: numAmount,
      currency: account.currency,
      balanceBefore,
      balanceAfter,
      note,
      createdBy,
    },
  ], { session });

  return updatedAccount;
}
