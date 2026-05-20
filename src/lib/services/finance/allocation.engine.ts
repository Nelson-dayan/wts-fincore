import { ClientSession, Types } from "mongoose";
import { PaymentAllocationModel, InvoiceModel, PaymentModel } from "@/lib/db/models";
import { getInvoiceSummary } from "@/lib/invoice/finance-calculations";
import { decimalToNumber } from "@/lib/services/business/money";

/**
 * Allocates a portion of a payment to a specific invoice.
 * Updates the invoice status and financial cache atomically.
 */
export async function allocate(
  paymentId: string | Types.ObjectId,
  invoiceId: string | Types.ObjectId,
  amount: number, // Amount in Invoice Currency
  rateUsed: number, // Payment Currency -> Invoice Currency conversion rate
  rateToBase: number, // Invoice Currency -> System Base Currency (INR) conversion rate
  createdBy: string | Types.ObjectId,
  session: ClientSession
) {
  // 1. Fetch Payment to get contextual IDs
  const payment = await PaymentModel.findById(paymentId).session(session);
  if (!payment) throw new Error("Payment not found");

  const projectId = payment.projectId;
  const invoice = await InvoiceModel.findById(invoiceId).session(session);
  if (!invoice) throw new Error("Invoice not found");

  const allocatedAmountBase = amount * rateToBase;

  // 2. Create or Update Allocation record
  await PaymentAllocationModel.findOneAndUpdate(
    { paymentId, invoiceId },
    {
      projectId,
      allocatedAmount: amount,
      allocatedCurrency: invoice.currency || (invoice as any).invoiceType?.toUpperCase() || "AED",
      allocatedAmountBase,
      exchangeRateUsed: rateUsed,
      exchangeRateToBase: rateToBase,
      allocatedAt: new Date(),
      createdBy
    },
    { upsert: true, session }
  );

  // 3. Trigger Invoice Financials Sync
  return await updateInvoiceFinancials(invoiceId, session);
}

/**
 * Recalculates an invoice's financial totals and status based on its allocations.
 */
export async function updateInvoiceFinancials(
  invoiceId: string | Types.ObjectId,
  session: ClientSession
) {
  const invoice = await InvoiceModel.findById(invoiceId).session(session);
  if (!invoice) throw new Error("Invoice not found");

  const allocations = await PaymentAllocationModel.find({ invoiceId }).session(session);
  
  const mapped = allocations.map(a => ({
    amount: decimalToNumber(a.allocatedAmount),
    amountBase: decimalToNumber(a.allocatedAmountBase)
  }));

  const invoiceTotal = decimalToNumber(invoice.totals?.total ?? 0);
  const summary = getInvoiceSummary(mapped, invoiceTotal);

  let status = invoice.status;
  
  // Only auto-update status if not in DRAFT or if it has allocations
  if (status !== "DRAFT" || summary.totalAllocated > 0) {
    if (summary.totalAllocated >= invoiceTotal && invoiceTotal > 0) {
      status = "PAID";
    } else if (summary.totalAllocated > 0) {
      status = "PARTIAL";
    } else {
      const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : new Date();
      status = dueDate.getTime() < Date.now() ? "OVERDUE" : "SENT";
    }
  }

  await InvoiceModel.updateOne(
    { _id: invoiceId },
    {
      $set: {
        status,
        "totalsCache.totalReceivedBase": summary.totalAllocatedBase,
        "totalsCache.lastCalculatedAt": new Date()
      },
      $inc: { "totalsCache.version": 1 }
    },
    { session }
  );

  return { summary, status };
}
