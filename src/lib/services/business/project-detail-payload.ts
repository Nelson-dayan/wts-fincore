import {
  ClientModel,
  ExpenseModel,
  InvoiceModel,
  ProjectModel,
  PurchaseOrderModel,
  QuotationModel,
} from "@/lib/db/models";
import { decimalToNumber } from "@/lib/services/business/money";

/**
 * Shared JSON shape for admin + employee project detail screens.
 */
export async function buildProjectDetailPayload(projectId: string) {
  const project = await ProjectModel.findById(projectId)
    .select(
      "name description status priority budget currency category clientReference notes startDate targetEndDate actualEndDate clientId assignedTo createdAt updatedAt fixCurrency"
    )
    .lean();
  if (!project) {
    return { notFound: true as const };
  }

  const [client, quotations, purchaseOrders, invoices, expensesRaw] = await Promise.all([
    ClientModel.findById(project.clientId)
      .select("_id name company email address website clientLogoText clientSignatureText")
      .lean(),
    QuotationModel.find({ projectId })
      .select("_id quotationNumber status createdAt")
      .sort({ createdAt: -1 })
      .lean(),
    PurchaseOrderModel.find({ projectId })
      .select("_id poNumber type status createdAt")
      .sort({ createdAt: -1 })
      .lean(),
    InvoiceModel.find({ projectId, isDeleted: { $ne: true } })
      .select("_id invoiceNumber status dueDate totals totalsCache totalAmountBase createdAt")
      .sort({ createdAt: -1 })
      .lean(),
    ExpenseModel.find({ projectId, isDeleted: { $ne: true } })
      .select("_id title amount currency baseAmount category createdAt")
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  const expenseTotal = expensesRaw.reduce((sum, e) => sum + decimalToNumber(e.amount), 0);
  const expenseTotalBase = expensesRaw.reduce(
    (sum, e) => sum + decimalToNumber(e.baseAmount || e.amount),
    0
  );

  const expenses = expensesRaw.map((e) => ({
    _id: String(e._id),
    title: e.title,
    amount: decimalToNumber(e.amount),
    currency: e.currency || "AED",
    baseAmount: decimalToNumber(e.baseAmount || e.amount),
    category: e.category,
    createdAt: e.createdAt,
  }));

  const totalReceivedBase = invoices.reduce((sum, inv) => {
    const cache = inv.totalsCache as { totalReceivedBase?: unknown } | undefined;
    return sum + (cache ? decimalToNumber(cache.totalReceivedBase) : 0);
  }, 0);

  const totalFeesBase = invoices.reduce((sum, inv) => {
    const cache = inv.totalsCache as { totalFeesBase?: unknown } | undefined;
    return sum + (cache ? decimalToNumber(cache.totalFeesBase) : 0);
  }, 0);

  const profitBase = totalReceivedBase - expenseTotalBase;

  return {
    notFound: false as const,
    project,
    client,
    quotations,
    purchaseOrders,
    invoices,
    expenses,
    expenseTotal,
    financials: {
      totalReceivedBase,
      totalFeesBase,
      totalExpensesBase: expenseTotalBase,
      profitBase,
    },
  };
}
