import type { ClientSession, Types } from "mongoose";
import { connectDB } from "@/lib/db/connect";
import { InvoiceModel, PaymentModel } from "@/lib/db/models";
import { decimalToNumber } from "@/lib/services/business/money";

export interface RecordPaymentInput {
  invoiceId: Types.ObjectId | string;
  amount: number;
  method: "cash" | "bank" | "upi";
  transactionId?: string;
  note?: string;
}

type InvoiceStatus = "unpaid" | "partial" | "paid" | "overdue";

function resolveInvoiceStatus(params: {
  paidAmount: number;
  invoiceTotal: number;
  dueDate: Date;
}): InvoiceStatus {
  const { paidAmount, invoiceTotal, dueDate } = params;
  if (paidAmount >= invoiceTotal && invoiceTotal > 0) return "paid";
  if (paidAmount > 0 && paidAmount < invoiceTotal) return "partial";
  if (paidAmount <= 0 && dueDate.getTime() < Date.now()) return "overdue";
  return "unpaid";
}

async function computePaidAmount(
  invoiceId: Types.ObjectId | string,
  session: ClientSession
): Promise<number> {
  const agg = await PaymentModel.aggregate<{ total: unknown }>([
    { $match: { invoiceId } },
    { $group: { _id: "$invoiceId", total: { $sum: "$amount" } } },
  ]).session(session);

  return decimalToNumber(agg[0]?.total);
}

export async function syncInvoicePaymentStatus(
  invoiceId: Types.ObjectId | string,
  session: ClientSession
): Promise<{ status: InvoiceStatus; paidAmount: number }> {
  const invoice = await InvoiceModel.findById(invoiceId)
    .select("totals.total dueDate")
    .session(session);

  if (!invoice) {
    throw new Error("Invoice not found");
  }

  const paidAmount = await computePaidAmount(invoiceId, session);
  const invoiceTotal = decimalToNumber(invoice.totals?.total);
  const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : new Date();

  const status = resolveInvoiceStatus({ paidAmount, invoiceTotal, dueDate });
  await InvoiceModel.updateOne({ _id: invoiceId }, { $set: { status } }, { session });

  return { status, paidAmount };
}

export async function recordPayment(input: RecordPaymentInput): Promise<{
  paymentId: string;
  invoiceStatus: InvoiceStatus;
  paidAmount: number;
}> {
  const db = await connectDB();
  const session = await db.startSession();
  try {
    let result = { paymentId: "", invoiceStatus: "unpaid" as InvoiceStatus, paidAmount: 0 };
    await session.withTransaction(async () => {
      if (input.amount <= 0) {
        throw new Error("Payment amount must be greater than zero");
      }

      const payment = await PaymentModel.create(
        [
          {
            invoiceId: input.invoiceId,
            amount: input.amount,
            method: input.method,
            transactionId: input.transactionId ?? "",
            note: input.note ?? "",
          },
        ],
        { session }
      );

      const statusInfo = await syncInvoicePaymentStatus(input.invoiceId, session);
      result = {
        paymentId: String(payment[0]?._id ?? ""),
        invoiceStatus: statusInfo.status,
        paidAmount: statusInfo.paidAmount,
      };
    });

    return result;
  } finally {
    await session.endSession();
  }
}

export async function markOverdueInvoices(): Promise<number> {
  await connectDB();
  const now = new Date();
  const result = await InvoiceModel.updateMany(
    {
      status: { $in: ["unpaid", "partial"] },
      dueDate: { $lt: now },
    },
    { $set: { status: "overdue" } }
  );

  return result.modifiedCount;
}
