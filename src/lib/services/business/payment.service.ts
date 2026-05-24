import type { ClientSession, Types } from "mongoose";
import { connectDB } from "@/lib/db/connect";
import { PaymentModel, PaymentAllocationModel, InvoiceModel } from "@/lib/db/models";
import { logActivity } from "@/lib/services/activity/log-activity.service";
import * as accountEngine from "@/lib/services/finance/account.engine";
import * as allocationEngine from "@/lib/services/finance/allocation.engine";
import { assertPeriodNotLocked } from "@/lib/services/business/period-lock.service";
import { 
  normalizeToBase, 
  convertBaseToTreasury, 
  floatLessThanOrEqual 
} from "@/lib/services/finance/forex.engine";

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
 * 1. Normalizes gross payment, fees, and allocations into Layer 1 base INR.
 * 2. Validates overallocation bounds entirely in base currency.
 * 3. Creates Payment record with locked exchange rate snapshots.
 * 4. Updates Account balance and records Transaction atomically.
 */
export async function recordPayment(input: RecordPaymentInput) {
  const db = await connectDB();
  const session = await db.startSession();
  try {
    let result: any = {};

    await session.withTransaction(async () => {
      await assertPeriodNotLocked(input.receivedAt || new Date());

      // 1. Core normalization to Layer 1 Base Currency (INR)
      const payCur = (input.paymentCurrency || input.currency).toUpperCase();
      const payGross = input.paymentAmountGross ?? input.amount;
      
      const grossBaseResult = normalizeToBase({ amount: payGross, currency: payCur });
      const paymentAmountGrossBase = grossBaseResult.amount;

      // 2. Normalize each individual fee currency to base INR independently
      const normalizedFees = (input.fees || []).map(f => {
        const norm = normalizeToBase({ amount: f.amount, currency: f.currency });
        return {
          type: f.type,
          label: f.label,
          amount: f.amount,
          currency: f.currency.toUpperCase(),
          baseAmount: norm.amount,
          note: f.note ?? ""
        };
      });

      const feeAmountBase = normalizedFees.reduce((sum, f) => sum + f.baseAmount, 0);

      // 3. Compute net amount in base INR
      const netBase = paymentAmountGrossBase - feeAmountBase;

      // 4. Compute original net payment currency representation
      const paymentAmountNet = input.paymentAmountNet ?? (payGross - (input.fees || []).reduce((sum, f) => sum + f.amount, 0));

      // 5. Build allocations pipeline & perform over-allocation validation strictly in base INR
      const rawAllocationsList = input.allocations && input.allocations.length > 0
        ? input.allocations
        : (input.invoiceId && input.allocationAmount
            ? [{ invoiceId: input.invoiceId, amount: input.allocationAmount, rate: input.allocationRate || 1, rateToBase: input.allocationRateToBase }]
            : []);

      let totalAllocatedBase = 0;
      const allocationsToProcess = [];

      for (const alloc of rawAllocationsList) {
        if (alloc.invoiceId && alloc.amount > 0) {
          const invoice = await InvoiceModel.findById(alloc.invoiceId).session(session);
          if (!invoice) throw new Error(`Invoice not found: ${alloc.invoiceId}`);

          const invCurrency = (invoice.currency || (invoice as any).invoiceType === "usd" ? "USD" : "AED").toUpperCase();
          
          // Compute allocation base consistently with the UI formula: (amount / rateUsed) * exchangeRateToBase
          const allocBase = alloc.rate > 0
            ? (alloc.amount / alloc.rate) * input.exchangeRateToBase
            : normalizeToBase({ amount: alloc.amount, currency: invCurrency }).amount;

          totalAllocatedBase += allocBase;

          const effectiveRateToBase = alloc.amount > 0 ? (allocBase / alloc.amount) : 1.0;

          allocationsToProcess.push({
            invoiceId: alloc.invoiceId,
            amount: alloc.amount, // original invoice currency amount
            rateUsed: alloc.rate,
            rateToBase: effectiveRateToBase
          });
        }
      }

      // STRICT OVER-ALLOCATION LEDGER CHECK IN BASE INR
      if (!floatLessThanOrEqual(totalAllocatedBase, netBase)) {
        throw new Error(`Overallocation detected: Total allocated amount in base (${totalAllocatedBase.toFixed(2)} INR) exceeds net payment base (${netBase.toFixed(2)} INR).`);
      }

      // 6. Create Payment Record (Money Movement)
      const payment = await PaymentModel.create(
        [
          {
            projectId: input.projectId,
            clientId: input.clientId,
            companyId: input.companyId,
            accountId: input.accountId,
            amount: input.amount, // Net amount received in account (Layer 2)
            amountBase: netBase,  // Layer 1
            feeAmount: (input.fees || []).reduce((sum, f) => sum + f.amount, 0),
            feeAmountBase,        // Layer 1
            currency: input.currency.toUpperCase(),
            exchangeRateToBase: input.exchangeRateToBase,
            method: input.method,
            referenceNumber: input.referenceNumber,
            receivedAt: input.receivedAt || new Date(),
            savedAt: new Date(),
            note: input.note,
            createdBy: input.createdBy,
            invoiceId: input.invoiceId || rawAllocationsList[0]?.invoiceId || undefined, // Backward compatibility link fallback
            paymentCurrency: payCur,
            paymentAmountGross: payGross,
            paymentAmountNet,
            fees: normalizedFees
          },
        ],
        { session }
      );

      const paymentId = payment[0]._id;

      // 7. Deposit into Treasury Account
      await accountEngine.deposit(
        input.accountId,
        input.amount,
        paymentId,
        input.createdBy,
        session,
        `Payment ${input.referenceNumber || paymentId} received`
      );

      // 8. Process Locked Invoice Allocations
      for (const alloc of allocationsToProcess) {
        await allocationEngine.allocate(
          paymentId,
          alloc.invoiceId,
          alloc.amount,
          alloc.rateUsed,
          alloc.rateToBase,
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
