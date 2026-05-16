import type { ClientSession, Types } from "mongoose";
import { connectDB } from "@/lib/db/connect";
import { CompanyModel, InvoiceModel, PaymentModel } from "@/lib/db/models";
import { decimalToNumber } from "@/lib/services/business/money";
import { logActivity } from "@/lib/services/activity/log-activity.service";
import { getInvoiceSummary, PaymentInput, InvoiceInput } from "@/lib/invoice/finance-calculations";
import { applyExchangeRate } from "@/lib/finance/engine";

export interface RecordPaymentInput {
  invoiceId: Types.ObjectId | string;
  companyId: Types.ObjectId | string;
  createdBy: Types.ObjectId | string;
  type: "PAYMENT" | "REFUND";
  method: "UPI" | "BANK_TRANSFER" | "PAYPAL" | "STRIPE" | "WISE" | "CASH";
  currency: string;
  exchangeRate: number;
  intendedAmount: number;
  receivedAmount: number;
  fees: { type: string; amount: number; currency: string }[];
  transactionId?: string;
  note?: string;
  originalPaymentId?: Types.ObjectId | string;
  sourceDetails?: { platform: string; accountId: string };
}

export async function updateInvoiceCache(
  invoiceId: Types.ObjectId | string,
  session: ClientSession
) {
  const invoice = await InvoiceModel.findById(invoiceId)
    .select("totals exchangeRate dueDate status")
    .session(session);

  if (!invoice) throw new Error("Invoice not found");

  const payments = await PaymentModel.find({ 
    invoiceId, 
    isDeleted: { $ne: true } 
  }).session(session);

  const mappedPayments: PaymentInput[] = payments.map((p) => ({
    type: p.type as "PAYMENT" | "REFUND",
    exchangeRate: decimalToNumber(p.exchangeRate),
    intendedAmount: decimalToNumber(p.intendedAmount),
    receivedAmount: decimalToNumber(p.receivedAmount),
    fees: p.fees.map((f: any) => ({ amount: decimalToNumber(f.amount) })),
  }));

  const invoiceInput: InvoiceInput = {
    exchangeRate: decimalToNumber(invoice.exchangeRate) || 1,
    totalAmount: decimalToNumber(invoice.totals?.total),
  };

  const summary = getInvoiceSummary(mappedPayments, invoiceInput);

  let status = invoice.status;
  const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : new Date();

  // Protect DRAFT status from being auto-updated unless paid
  if (status !== "DRAFT" || summary.totalReceivedBase > 0) {
    if (summary.totalReceivedBase >= summary.invoiceAmountBase && summary.invoiceAmountBase > 0) {
      status = "PAID";
    } else if (summary.totalReceivedBase > 0 && summary.totalReceivedBase < summary.invoiceAmountBase) {
      status = "PARTIAL";
    } else if (summary.totalReceivedBase <= 0) {
      status = dueDate.getTime() < Date.now() ? "OVERDUE" : "SENT";
    }
  }

  await InvoiceModel.updateOne(
    { _id: invoiceId },
    { 
      $set: { 
        status,
        "totalsCache.totalReceivedBase": summary.totalReceivedBase,
        "totalsCache.totalFeesBase": summary.totalFeesBase,
        "totalsCache.totalIntendedBase": summary.totalIntendedBase,
        "totalsCache.overpaidAmountBase": summary.overpaidAmountBase,
        "totalsCache.lastCalculatedAt": new Date()
      },
      $inc: { "totalsCache.version": 1 }
    },
    { session }
  );

  return { summary, status };
}

export async function recordPayment(input: RecordPaymentInput) {
  const db = await connectDB();
  const session = await db.startSession();
  try {
    let result = { paymentId: "", invoiceStatus: "SENT" };

    await session.withTransaction(async () => {
      // 1. Validations
      if (!input.invoiceId) throw new Error("invoiceId is required");
      
      const invoice = await InvoiceModel.findById(input.invoiceId).select("companyId exchangeRate totals").session(session);
      if (!invoice) throw new Error("Invoice not found.");

      let companyId = input.companyId || invoice.companyId;
      if (!companyId) {
        const primary = await CompanyModel.findOne({ isPrimary: true }).select("_id").session(session);
        if (primary) companyId = primary._id;
      }
      
      if (!companyId) throw new Error("companyId is required and could not be found on the invoice or primary company.");

      if (input.type === "REFUND" && !input.originalPaymentId) {
        throw new Error("Refunds must link to an originalPaymentId.");
      }
      
      const totalFees = (input.fees || []).reduce((sum, f) => sum + f.amount, 0);
      if (totalFees > input.intendedAmount) {
        throw new Error("Fees cannot exceed the intended amount.");
      }

      // 2. Strict Backend Currency Conversion
      const baseCurrency = "INR"; // Enforced system default
      const intendedAmountBase = applyExchangeRate(input.intendedAmount, input.exchangeRate);
      const receivedAmountBase = applyExchangeRate(input.receivedAmount, input.exchangeRate);

      const feesWithBase = (input.fees || []).map(f => ({
        ...f,
        baseAmount: applyExchangeRate(f.amount || 0, input.exchangeRate)
      }));

      // 3. Create Payment
      const payment = await PaymentModel.create(
        [
          {
            invoiceId: input.invoiceId,
            companyId: companyId,
            type: input.type,
            method: input.method,
            currency: input.currency,
            baseCurrency,
            exchangeRate: input.exchangeRate,
            intendedAmount: input.intendedAmount,
            receivedAmount: input.receivedAmount,
            intendedAmountBase,
            receivedAmountBase,
            fees: feesWithBase,
            transactionId: input.transactionId,
            note: input.note,
            originalPaymentId: input.originalPaymentId,
            sourceDetails: input.sourceDetails,
            createdBy: input.createdBy,
          },
        ],
        { session }
      );

      const { status, summary } = await updateInvoiceCache(input.invoiceId, session);

      const paymentId = String(payment[0]?._id ?? "");

      // Log activity
      await logActivity({
        userId: String(input.createdBy),
        action: "PAYMENT_RECORDED",
        entityType: "Payment",
        entityId: paymentId,
        message: `Payment of ${input.currency} ${input.receivedAmount} recorded via ${input.method}`,
        metadata: {
          invoiceId: String(input.invoiceId),
          amount: input.receivedAmount,
          method: input.method,
          statusChange: invoice ? invoice.status !== status : false
        }
      });

      result = {
        paymentId,
        invoiceStatus: status,
        summary
      };
    });

    return result;
  } finally {
    await session.endSession();
  }
}

export async function deletePayment(paymentId: string) {
  const db = await connectDB();
  const session = await db.startSession();
  try {
    let invoiceStatus = "SENT";

    await session.withTransaction(async () => {
      const payment = await PaymentModel.findById(paymentId).session(session);
      if (!payment) throw new Error("Payment not found");

      await PaymentModel.updateOne(
        { _id: paymentId },
        { $set: { isDeleted: true, deletedAt: new Date() } },
        { session }
      );

      const { status } = await updateInvoiceCache(payment.invoiceId, session);
      invoiceStatus = status;
    });

    return { success: true, invoiceStatus };
  } finally {
    await session.endSession();
  }
}

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
