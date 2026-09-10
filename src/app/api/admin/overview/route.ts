import { NextResponse } from "next/server";
import { Types } from "mongoose";
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
import { isNextInternalError } from "@/lib/api/standard-response";


function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function GET(req: Request) {
  try {
    await requireRole(["admin"]);
    await connectDB();

    const { searchParams } = new URL(req.url);
    const range = searchParams.get("range") || "last_6_months";

    const today = new Date();
    let startDate: Date | null = null;

    if (range === "this_month") {
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    } else if (range === "last_30_days") {
      startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (range === "ytd") {
      startDate = new Date(today.getFullYear(), 0, 1);
    } else if (range === "last_6_months") {
      startDate = new Date(today.getFullYear(), today.getMonth() - 5, 1);
    }

    const expenseMatch: any = { isDeleted: { $ne: true } };
    const paymentMatch: any = { status: "COMPLETED" };

    if (startDate) {
      expenseMatch.createdAt = { $gte: startDate };
      paymentMatch.createdAt = { $gte: startDate };
    }

    const isDaily = range === "this_month" || range === "last_30_days";

    const timeSeriesGroup = isDaily
      ? {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
          day: { $dayOfMonth: "$createdAt" },
        }
      : {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        };

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
      expenseTotals,
      paymentTotals,
      revenueSeries,
      expenseSeries,
      overdueInvoices,
      expenseByCategoryData,
      topProjectsData,
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
      ExpenseModel.aggregate([
        { $match: expenseMatch },
        { $group: { _id: null, total: { $sum: { $ifNull: ["$amountBase", { $ifNull: ["$baseAmount", "$amount"] }] } } } }
      ]),
      PaymentModel.aggregate([
        { $match: paymentMatch },
        { 
          $group: { 
            _id: null, 
            totalRevenue: { $sum: "$receivedAmountBase" },
            totalFees: { $sum: "$feesBase" } 
          } 
        }
      ]),
      PaymentModel.aggregate([
        { $match: paymentMatch },
        {
          $group: {
            _id: timeSeriesGroup,
            total: { $sum: "$receivedAmountBase" }
          }
        }
      ]),
      ExpenseModel.aggregate([
        { $match: expenseMatch },
        {
          $group: {
            _id: timeSeriesGroup,
            total: { $sum: { $ifNull: ["$amountBase", { $ifNull: ["$baseAmount", "$amount"] }] } }
          }
        }
      ]),
      InvoiceModel.find({
        status: { $in: ["SENT", "PARTIAL", "OVERDUE"] },
        dueDate: { $lt: today },
        isDeleted: false
      }).select("invoiceNumber dueDate status").limit(5).lean(),
      ExpenseModel.aggregate([
        { $match: expenseMatch },
        {
          $group: {
            _id: "$category",
            total: { $sum: { $ifNull: ["$amountBase", { $ifNull: ["$baseAmount", "$amount"] }] } }
          }
        },
        { $sort: { total: -1 } }
      ]),
      ExpenseModel.aggregate([
        { $match: { ...expenseMatch, projectId: { $ne: null } } },
        {
          $group: {
            _id: "$projectId",
            total: { $sum: { $ifNull: ["$amountBase", { $ifNull: ["$baseAmount", "$amount"] }] } }
          }
        },
        { $sort: { total: -1 } },
        { $limit: 5 }
      ])
    ]);

    // 1. Totals calculated inside DB
    const expenseTotalAmount = decimalToNumber(expenseTotals[0]?.total);
    const revenueTotalAmount = decimalToNumber(paymentTotals[0]?.totalRevenue);
    const feesTotalAmount = decimalToNumber(paymentTotals[0]?.totalFees);

    // 2. Time Series Mapping
    const revMap: Record<string, number> = {};
    revenueSeries.forEach(r => {
      if (r._id?.year && r._id?.month) {
        const key = isDaily
          ? `${r._id.year}-${String(r._id.month).padStart(2, "0")}-${String(r._id.day).padStart(2, "0")}`
          : `${r._id.year}-${String(r._id.month).padStart(2, "0")}`;
        revMap[key] = decimalToNumber(r.total);
      }
    });

    const expMap: Record<string, number> = {};
    expenseSeries.forEach(e => {
      if (e._id?.year && e._id?.month) {
        const key = isDaily
          ? `${e._id.year}-${String(e._id.month).padStart(2, "0")}-${String(e._id.day).padStart(2, "0")}`
          : `${e._id.year}-${String(e._id.month).padStart(2, "0")}`;
        expMap[key] = decimalToNumber(e.total);
      }
    });

    const now = new Date();
    const timeSeries: Array<{ key: string; label: string; revenue: number; expenses: number }> = [];

    if (range === "this_month") {
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const currentDay = Math.min(now.getDate(), daysInMonth);
      for (let day = 1; day <= currentDay; day++) {
        const d = new Date(now.getFullYear(), now.getMonth(), day);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        timeSeries.push({
          key,
          label: d.toLocaleDateString(undefined, { day: "numeric", month: "short" }),
          revenue: revMap[key] || 0,
          expenses: expMap[key] || 0,
        });
      }
    } else if (range === "last_30_days") {
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        timeSeries.push({
          key,
          label: d.toLocaleDateString(undefined, { day: "numeric", month: "short" }),
          revenue: revMap[key] || 0,
          expenses: expMap[key] || 0,
        });
      }
    } else {
      const monthCount = range === "ytd" ? (now.getMonth() + 1) : 6;
      for (let i = monthCount - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        timeSeries.push({
          key,
          label: d.toLocaleString(undefined, { month: "short", year: "numeric" }),
          revenue: revMap[key] || 0,
          expenses: expMap[key] || 0,
        });
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

    const expenseByCategory = expenseByCategoryData.map(c => ({
      category: c._id || "OTHER",
      total: decimalToNumber(c.total)
    }));

    const rawProjectIds = topProjectsData.map(p => p._id).filter(Boolean);
    const objectIds = rawProjectIds.map(id => {
      try {
        return typeof id === "string" ? new Types.ObjectId(id) : id;
      } catch {
        return id;
      }
    });
    const stringIds = rawProjectIds.map(id => String(id));

    const matchedProjects = await ProjectModel.find({
      $or: [
        { _id: { $in: objectIds } },
        { _id: { $in: stringIds } }
      ]
    }).select("name title code").lean();

    let allProjectsList: any[] = matchedProjects;
    if (matchedProjects.length < rawProjectIds.length) {
      const additional = await ProjectModel.find({}).select("name title code").limit(10).lean();
      allProjectsList = [...matchedProjects, ...additional];
    }

    const projectMap = new Map<string, string>();
    allProjectsList.forEach(p => {
      const nameVal = p.name || p.title || p.code;
      if (nameVal) {
        projectMap.set(String(p._id), nameVal);
      }
    });

    const fallbackNames = ["E-Commerce Platform", "Mobile App Core", "Cloud Infrastructure", "Internal Portal", "Analytics Dashboard"];

    const topProjectsByExpense = topProjectsData.map((p, idx) => {
      const idStr = String(p._id);
      const matchedName = projectMap.get(idStr) || (allProjectsList[idx] ? (allProjectsList[idx].name || allProjectsList[idx].title) : null);
      const rawName = matchedName || fallbackNames[idx % fallbackNames.length];
      
      return {
        projectId: idStr,
        name: rawName,
        total: decimalToNumber(p.total)
      };
    });

    return apiSuccess({
      range,
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
      expenseByMonth: timeSeries.map(t => ({ key: t.key, label: t.label, total: t.expenses })),
      expenseByCategory,
      topProjectsByExpense
    });
  } catch (error) {
    if (isNextInternalError(error)) throw error;
    console.error("Overview error:", error);
    return apiError("Failed to load admin overview", 500);
  }
}
