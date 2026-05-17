import { ClientSession, Types } from "mongoose";
import { AccountModel, AccountTransactionModel } from "@/lib/db/models";

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
  const account = await AccountModel.findById(accountId).session(session);
  if (!account) throw new Error("Account not found");

  const balanceBefore = account.currentBalance;
  
  // Update Account Balance
  // We use findOneAndUpdate to get the updated document in one go if possible, 
  // but updateOne + findById is safer for session consistency in some Mongo versions.
  await AccountModel.updateOne(
    { _id: accountId },
    { $inc: { currentBalance: amount } },
    { session }
  );

  const updatedAccount = await AccountModel.findById(accountId).session(session);
  if (!updatedAccount) throw new Error("Account not found after update");
  
  const balanceAfter = updatedAccount.currentBalance;

  // Record Transaction
  await AccountTransactionModel.create([
    {
      accountId,
      paymentId,
      transferId,
      type: "CREDIT",
      amount,
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
  const account = await AccountModel.findById(accountId).session(session);
  if (!account) throw new Error("Account not found");

  const balanceBefore = account.currentBalance;
  
  // Update Account Balance (Negative increment for withdrawal)
  const negativeAmount = typeof amount === "number" ? -amount : `-${amount}`;
  
  await AccountModel.updateOne(
    { _id: accountId },
    { $inc: { currentBalance: negativeAmount } },
    { session }
  );

  const updatedAccount = await AccountModel.findById(accountId).session(session);
  if (!updatedAccount) throw new Error("Account not found after update");
  
  const balanceAfter = updatedAccount.currentBalance;

  // Record Transaction
  await AccountTransactionModel.create([
    {
      accountId,
      paymentId,
      transferId,
      type: "DEBIT",
      amount,
      currency: account.currency,
      balanceBefore,
      balanceAfter,
      note,
      createdBy,
    },
  ], { session });

  return updatedAccount;
}
