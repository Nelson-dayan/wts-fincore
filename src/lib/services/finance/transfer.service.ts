import type { ClientSession, Types } from "mongoose";
import { connectDB } from "@/lib/db/connect";
import { TransferModel, AccountModel } from "@/lib/db/models";
import { logActivity } from "@/lib/services/activity/log-activity.service";
import * as accountEngine from "./account.engine";

export interface CreateTransferInput {
  fromAccountId: string | Types.ObjectId;
  toAccountId: string | Types.ObjectId;
  fromAmount: number;
  toAmount: number;
  exchangeRate: number;
  fees?: number;
  reference?: string;
  note?: string;
  createdBy: string | Types.ObjectId;
}

/**
 * Records a new bank-to-bank transfer atomically.
 */
export async function recordTransfer(input: CreateTransferInput) {
  const db = await connectDB();
  const session = await db.startSession();
  try {
    let result: any = {};
    await session.withTransaction(async () => {
      // 1. Fetch Accounts
      const fromAccount = await AccountModel.findById(input.fromAccountId).session(session);
      const toAccount = await AccountModel.findById(input.toAccountId).session(session);
      
      if (!fromAccount) throw new Error("Source account not found");
      if (!toAccount) throw new Error("Destination account not found");
      if (String(fromAccount._id) === String(toAccount._id)) {
        throw new Error("Source and destination accounts must be different");
      }

      // 2. Create Transfer Record
      const transfer = await TransferModel.create(
        [
          {
            fromAccountId: input.fromAccountId,
            toAccountId: input.toAccountId,
            fromAmount: input.fromAmount,
            fromCurrency: fromAccount.currency,
            toAmount: input.toAmount,
            toCurrency: toAccount.currency,
            exchangeRate: input.exchangeRate,
            fees: input.fees || 0,
            reference: input.reference || "",
            note: input.note || "",
            status: "COMPLETED",
            createdBy: input.createdBy,
          },
        ],
        { session }
      );

      const transferId = transfer[0]._id;

      // 3. Withdraw from Source Account
      await accountEngine.withdraw(
        input.fromAccountId,
        input.fromAmount,
        undefined,
        input.createdBy,
        session,
        `Transfer to ${toAccount.name}: ${input.reference || transferId}`,
        transferId
      );

      // 4. Deposit to Destination Account
      await accountEngine.deposit(
        input.toAccountId,
        input.toAmount,
        undefined,
        input.createdBy,
        session,
        `Transfer from ${fromAccount.name}: ${input.reference || transferId}`,
        transferId
      );

      // 5. Log Activity
      await logActivity({
        userId: String(input.createdBy),
        action: "TRANSFER_CREATED",
        entityType: "Transfer",
        entityId: String(transferId),
        message: `Transferred ${input.fromAmount} ${fromAccount.currency} to ${toAccount.name} (${input.toAmount} ${toAccount.currency})`,
        metadata: {
          fromAccountId: String(input.fromAccountId),
          toAccountId: String(input.toAccountId),
        }
      });

      result = {
        transferId: String(transferId),
        success: true
      };
    });

    return result;
  } finally {
    await session.endSession();
  }
}
