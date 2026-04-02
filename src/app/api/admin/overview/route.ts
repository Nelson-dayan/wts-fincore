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

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function GET() {
  try {
    await requireRole(["admin"]);
    await connectDB();

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
    ] = await Promise.all([
      UserModel.countDocuments(),
      ClientModel.countDocuments(),
      ProjectModel.countDocuments(),
      QuotationModel.countDocuments(),
      PurchaseOrderModel.countDocuments(),
      InvoiceModel.countDocuments(),
      PaymentModel.countDocuments(),
      ExpenseModel.countDocuments(),
      ActivityLogModel.countDocuments(),
      ExpenseModel.find({}).select("amount category createdAt projectId").lean(),
    ]);

    const expenseTotalAmount = allExpensesLean.reduce(
      (s, e) => s + decimalToNumber(e.amount),
      0
    );

    const now = new Date();
    const expenseByMonth: Array<{ key: string; label: string; total: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      expenseByMonth.push({
        key: monthKey(d),
        label: d.toLocaleString(undefined, { month: "short", year: "numeric" }),
        total: 0,
      });
    }
    const monthIndex = new Map(expenseByMonth.map((m, idx) => [m.key, idx]));
    for (const e of allExpensesLean) {
      const c = e.createdAt ? new Date(e.createdAt as Date) : null;
      if (!c || Number.isNaN(c.getTime())) continue;
      const key = monthKey(c);
      const idx = monthIndex.get(key);
      if (idx !== undefined) {
        expenseByMonth[idx].total += decimalToNumber(e.amount);
      }
    }

    const categoryMap = new Map<string, number>();
    for (const e of allExpensesLean) {
      const cat = String(e.category ?? "Other").trim() || "Other";
      categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + decimalToNumber(e.amount));
    }
    const expenseByCategory = [...categoryMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([category, total]) => ({ category, total }));

    const projectTotals = new Map<string, number>();
    for (const e of allExpensesLean) {
      if (!e.projectId) continue;
      const pid = String(e.projectId);
      projectTotals.set(pid, (projectTotals.get(pid) ?? 0) + decimalToNumber(e.amount));
    }
    const topProjectIds = [...projectTotals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id]) => id);
    const projectDocs =
      topProjectIds.length > 0
        ? await ProjectModel.find({ _id: { $in: topProjectIds } })
            .select("name")
            .lean()
        : [];
    const nameById = new Map(projectDocs.map((p) => [String(p._id), String(p.name ?? "")]));
    const topProjectsByExpense = topProjectIds.map((id) => ({
      projectId: id,
      name: nameById.get(id) ?? id,
      total: projectTotals.get(id) ?? 0,
    }));

    return NextResponse.json({
      users,
      clients,
      projects,
      quotations,
      purchaseOrders,
      invoices,
      payments,
      expenses,
      activityLogs,
      expenseTotalAmount,
      expenseByMonth,
      expenseByCategory,
      topProjectsByExpense,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(
      { message: "Failed to load admin overview" },
      { status: 500 }
    );
  }
}
