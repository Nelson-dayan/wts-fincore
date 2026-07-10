import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connect";
import {
  ActivityLogModel,
  ClientModel,
  ExpenseModel,
  InvoiceModel,
  PaymentModel,
  ProjectModel,
  PurchaseOrderModel,
  QuotationModel,
  UserModel,
} from "@/lib/db/models";
import { requireRole } from "@/lib/auth/require-role";
import { decimalToNumber } from "@/lib/services/business/money";
import { apiSuccess, apiError } from "@/lib/api/response";


function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function GET() {
  try {
    await requireRole(["admin"]);
    await connectDB();

    const today = new Date();

    const [
      users,
      clients,
      projects,
      quotations,
      purchaseOrders,
      invoices,
      payments,
      expenses,
      activityLogs,
      allExpensesLean,
      allPaymentsLean,
      overdueInvoices,
    ] = await Promise.all([
      UserModel.countDocuments(),
      ClientModel.countDocuments(),
      ProjectModel.countDocuments(),
      QuotationModel.countDocuments(),
      PurchaseOrderModel.countDocuments(),
      InvoiceModel.countDocuments(),
      PaymentModel.countDocuments(),
      ExpenseModel.countDocuments({ isDeleted: { $ne: true } }),
      ActivityLogModel.countDocuments(),
      ExpenseModel.find({ isDeleted: { $ne: true } }).select("amountBase category createdAt projectId").lean(),
      PaymentModel.find({ status: "COMPLETED" }).select("receivedAmountBase feesBase createdAt invoiceId").lean(),
      InvoiceModel.find({
        status: { $in: ["SENT", "PARTIAL", "OVERDUE"] },
        dueDate: { $lt: today },
        isDeleted: false
      }).select("invoiceNumber dueDate status").limit(5).lean()
    ]);

    // 1. Expense Aggregation
    const expenseTotalAmount = allExpensesLean.reduce(
      (s, e) => s + decimalToNumber(e.amountBase || (e as any).amount),
      0
    );

    // 2. Revenue Aggregation
    const revenueTotalAmount = allPaymentsLean.reduce(
      (s, p) => s + decimalToNumber(p.receivedAmountBase),
      0
    );

    const feesTotalAmount = allPaymentsLean.reduce(
      (s, p) => s + decimalToNumber(p.feesBase),
      0
    );

    // 3. Time Series (Last 6 Months)
    const now = new Date();
    const timeSeries: Array<{ key: string; label: string; revenue: number; expenses: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      timeSeries.push({
        key: monthKey(d),
        label: d.toLocaleString(undefined, { month: "short", year: "numeric" }),
        revenue: 0,
        expenses: 0,
      });
    }
    const monthIndex = new Map(timeSeries.map((m, idx) => [m.key, idx]));

    for (const e of allExpensesLean) {
      const c = e.createdAt ? new Date(e.createdAt as Date) : null;
      if (!c || Number.isNaN(c.getTime())) continue;
      const key = monthKey(c);
      const idx = monthIndex.get(key);
      if (idx !== undefined) {
        timeSeries[idx].expenses += decimalToNumber(e.amountBase || (e as any).amount);
      }
    }

    for (const p of allPaymentsLean) {
      const c = p.createdAt ? new Date(p.createdAt as Date) : null;
      if (!c || Number.isNaN(c.getTime())) continue;
      const key = monthKey(c);
      const idx = monthIndex.get(key);
      if (idx !== undefined) {
        timeSeries[idx].revenue += decimalToNumber(p.receivedAmountBase);
      }
    }

    // 4. Notifications (Actionable)
    const notifications = overdueInvoices.map(inv => ({
      type: "OVERDUE_INVOICE",
      title: `Invoice ${inv.invoiceNumber} is overdue`,
      description: `Due date was ${new Date(inv.dueDate).toLocaleDateString()}. Action suggested: Trigger reminder or follow up.`,
      actionUrl: `/admin/invoices/${inv._id}`,
      severity: inv.status === "OVERDUE" ? "high" : "medium"
    }));

    return apiSuccess({
      users,
      clients,
      projects,
      quotations,
      purchaseOrders,
      invoices,
      payments,
      expenses,
      activityLogs,
      revenueTotalAmount,
      expenseTotalAmount,
      feesTotalAmount,
      profitTotalAmount: revenueTotalAmount - (expenseTotalAmount + feesTotalAmount),
      timeSeries,
      notifications,
      // For backward compatibility with AdminOverviewCharts if needed
      expenseByMonth: timeSeries.map(t => ({ key: t.key, label: t.label, total: t.expenses })),
      expenseByCategory: [], // Could aggregate if needed
      topProjectsByExpense: [] // Could aggregate if needed
    });
  } catch (error) {
    console.error("Overview error:", error);
    return apiError("Failed to load admin overview", 500);
  }
}
