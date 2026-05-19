import type { ClientSession, Types } from "mongoose";
import { connectDB } from "@/lib/db/connect";
import { PaymentModel, PaymentAllocationModel, InvoiceModel } from "@/lib/db/models";
import { logActivity } from "@/lib/services/activity/log-activity.service";
import * as accountEngine from "@/lib/services/finance/account.engine";
import * as allocationEngine from "@/lib/services/finance/allocation.engine";
import { assertPeriodNotLocked } from "@/lib/services/business/period-lock.service";

export interface RecordPaymentInput {
  projectId: string | Types.ObjectId;
  clientId: string | Types.ObjectId;
  companyId: string | Types.ObjectId;
  accountId: string | Types.ObjectId;
  
  amount: number;
  currency: string;
  exchangeRateToBase: number;
  
  method: "UPI" | "BANK_TRANSFER" | "PAYPAL" | "STRIPE" | "WISE" | "CASH";
  referenceNumber?: string;
  receivedAt?: Date;
  note?: string;
  
  createdBy: string | Types.ObjectId;
  
  // Optional immediate allocation
  invoiceId?: string | Types.ObjectId;
  allocationAmount?: number;
  allocationRate?: number;
  allocationRateToBase?: number;

  // New: Multiple allocations
  allocations?: Array<{
    invoiceId: string | Types.ObjectId;
    amount: number;
    rate: number;
    rateToBase?: number;
  }>;
  paymentCurrency?: string;
  paymentAmountGross?: number;
  paymentAmountNet?: number;
  fees?: Array<{
    type: "GATEWAY_FEE" | "BANK_CHARGE" | "GST_ON_FEE" | "FOREX" | "TDS" | "OTHER";
    label: string;
    amount: number;
    currency: string;
    baseAmount?: number;
    note?: string;
  }>;
}

/**
 * Records a new payment event.
 * 1. Creates Payment record.
 * 2. Updates Account balance and records Transaction.
 * 3. (Optional) Allocates funds to an invoice.
 */
export async function recordPayment(input: RecordPaymentInput) {
  const db = await connectDB();
  const session = await db.startSession();
  try {
    let result: any = {};

    await session.withTransaction(async () => {
      await assertPeriodNotLocked(input.receivedAt || new Date());
      const amountBase = input.amount * input.exchangeRateToBase;
      // For now, let's assume fees are handled in the input if we want them
      const feeAmount = (input as any).feeAmount || 0;
      const feeAmountBase = feeAmount * input.exchangeRateToBase;

      // 1. Create Payment (Money Movement)
      const payment = await PaymentModel.create(
        [
          {
            projectId: input.projectId,
            clientId: input.clientId,
            companyId: input.companyId,
            accountId: input.accountId,
            amount: input.amount,
            amountBase,
            feeAmount,
            feeAmountBase,
            currency: input.currency,
            exchangeRateToBase: input.exchangeRateToBase,
            method: input.method,
            referenceNumber: input.referenceNumber,
            receivedAt: input.receivedAt || new Date(),
            note: input.note,
            createdBy: input.createdBy,
            invoiceId: input.invoiceId, // Backward compatibility link
            paymentCurrency: input.paymentCurrency || input.currency,
            paymentAmountGross: input.paymentAmountGross ?? input.amount,
            paymentAmountNet: input.paymentAmountNet ?? input.amount,
            fees: (input.fees || []).map(f => ({
              ...f,
              baseAmount: (f.baseAmount ?? f.amount) * (input.exchangeRateToBase || 1)
            }))
          },
        ],
        { session }
      );

      const paymentId = payment[0]._id;

      // 2. Deposit into Account
      await accountEngine.deposit(
        input.accountId,
        input.amount,
        paymentId,
        input.createdBy,
        session,
        `Payment ${input.referenceNumber || paymentId} received`
      );

      // 3. Handle Optional Allocation
      if (input.allocations && input.allocations.length > 0) {
        for (const alloc of input.allocations) {
          if (alloc.invoiceId && alloc.amount > 0) {
            const rateToBase = 1;

            await allocationEngine.allocate(
              paymentId,
              alloc.invoiceId,
              alloc.amount,
              alloc.rate || 1,
              alloc.rateToBase || rateToBase,
              input.createdBy,
              session
            );
          }
        }
      } else if (input.invoiceId && input.allocationAmount) {
        await allocationEngine.allocate(
          paymentId,
          input.invoiceId,
          input.allocationAmount,
          input.allocationRate || 1,
          input.allocationRateToBase || 1,
          input.createdBy,
          session
        );
      }

      // 4. Log Activity
      await logActivity({
        userId: String(input.createdBy),
        action: "PAYMENT_RECORDED",
        entityType: "Payment",
        entityId: String(paymentId),
        message: `Payment of ${input.currency} ${input.amount} recorded for project`,
        metadata: {
          projectId: String(input.projectId),
          accountId: String(input.accountId),
          invoiceId: input.invoiceId ? String(input.invoiceId) : undefined
        }
      });

      result = {
        paymentId: String(paymentId),
        success: true
      };
    });

    return result;
  } finally {
    await session.endSession();
  }
}

/**
 * Deletes (voids) a payment.
 * 1. Reverts account balance.
 * 2. Deletes all associated allocations.
 * 3. Syncs affected invoices.
 */
export async function deletePayment(paymentId: string, deletedBy: string) {
  const db = await connectDB();
  const session = await db.startSession();
  try {
    await session.withTransaction(async () => {
      const payment = await PaymentModel.findById(paymentId).session(session);
      if (!payment) throw new Error("Payment not found");

      await assertPeriodNotLocked(payment.receivedAt);

      // 1. Revert Account Balance
      await accountEngine.withdraw(
        payment.accountId,
        payment.amount,
        paymentId,
        deletedBy,
        session,
        `Reversal of payment ${payment.referenceNumber || paymentId}`
      );

      // 2. Remove Allocations & Sync Invoices
      const allocations = await PaymentAllocationModel.find({ paymentId }).session(session);
      const invoiceIds = allocations.map(a => a.invoiceId);

      await PaymentAllocationModel.deleteMany({ paymentId }, { session });

      for (const invId of invoiceIds) {
        await allocationEngine.updateInvoiceFinancials(invId, session);
      }

      // 3. Mark Payment as deleted
      await PaymentModel.updateOne(
        { _id: paymentId },
        { $set: { isDeleted: true, deletedAt: new Date() } },
        { session }
      );
      
      // 4. Log Activity
      await logActivity({
        userId: deletedBy,
        action: "PAYMENT_DELETED",
        entityType: "Payment",
        entityId: paymentId,
        message: `Deleted payment of ${payment.currency} ${payment.amount}`
      });
    });

    return { success: true };
  } finally {
    await session.endSession();
  }
}

/**
 * Background task to mark invoices as overdue if past due date.
 */
export async function markOverdueInvoices(): Promise<number> {
  await connectDB();
  const now = new Date();
  const result = await InvoiceModel.updateMany(
    {
      status: { $in: ["SENT", "PARTIAL"] },
      dueDate: { $lt: now },
      isDeleted: { $ne: true }
    },
    { $set: { status: "OVERDUE" } }
  );

  return result.modifiedCount;
}
