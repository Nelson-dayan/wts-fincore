import mongoose from "mongoose";
import { LedgerEntryModel } from "@/lib/db/models";

export interface PostLedgerEntryInput {
  companyId: string | mongoose.Types.ObjectId;
  projectId?: string | mongoose.Types.ObjectId;
  financialDate: Date;
  referenceType: "Invoice" | "Payment" | "Expense" | "Transfer";
  referenceId: string | mongoose.Types.ObjectId;
  description?: string;
  debitAccountId: string | mongoose.Types.ObjectId;
  creditAccountId: string | mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  exchangeRate: number;
  createdBy: string | mongoose.Types.ObjectId;
}

/**
 * Posts a new balanced double-entry ledger entry within an optional session.
 */
export async function postLedgerEntry(
  input: PostLedgerEntryInput,
  session?: mongoose.ClientSession
): Promise<string> {
  const amountBase = Math.round(input.amount * input.exchangeRate * 100) / 100;

  const [created] = await LedgerEntryModel.create(
    [
      {
        companyId: new mongoose.Types.ObjectId(input.companyId),
        projectId: input.projectId ? new mongoose.Types.ObjectId(input.projectId) : undefined,
        financialDate: input.financialDate,
        referenceType: input.referenceType,
        referenceId: new mongoose.Types.ObjectId(input.referenceId),
        description: input.description ?? "",
        debitAccountId: new mongoose.Types.ObjectId(input.debitAccountId),
        creditAccountId: new mongoose.Types.ObjectId(input.creditAccountId),
        amount: Math.round(input.amount * 100) / 100,
        currency: input.currency,
        amountBase,
        exchangeRate: input.exchangeRate,
        createdBy: new mongoose.Types.ObjectId(input.createdBy),
      },
    ],
    { session }
  );

  return String(created._id);
}
