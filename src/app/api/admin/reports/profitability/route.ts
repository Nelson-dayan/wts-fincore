import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { 
  ProjectModel, 
  PaymentModel, 
  ExpenseModel, 
  InvoiceModel 
} from "@/lib/db/models";
import { requireRole } from "@/lib/auth/require-role";
import { authErrorResponse } from "@/lib/api/route-auth";
import { startOfMonth, subMonths, subDays, startOfYear, format } from "date-fns";

export async function GET(req: Request) {
  try {
    await requireRole(["admin"]);
    await connectDB();

    const { searchParams } = new URL(req.url);
    const range = searchParams.get("range") || "last_6_months";

    const now = new Date();
    let startDate: Date | null = null;

    if (range === "this_month") {
      startDate = startOfMonth(now);
    } else if (range === "last_30_days") {
      startDate = subDays(now, 30);
    } else if (range === "ytd") {
      startDate = startOfYear(now);
    } else if (range === "last_6_months") {
      startDate = subMonths(now, 6);
    }
    // all_time -> startDate remains null

    // 1. Fetch Projects (only necessary fields)
    const projects = await ProjectModel.find({})
      .select("name status budget currency createdAt")
      .sort({ createdAt: -1 })
      .lean();

    // 2. Aggregate Payments per Project via Invoices using MongoDB pipeline
    const paymentMatch: any = { status: "COMPLETED" };
    if (startDate) paymentMatch.createdAt = { $gte: startDate };

    const paymentByInvoicePipeline: any[] = [
      { $match: paymentMatch },
      {
        $group: {
          _id: "$invoiceId",
          totalRevenue: { $sum: "$receivedAmountBase" },
          totalFees: { $sum: "$feesBase" }
        }
      }
    ];

    const paymentSummary = await PaymentModel.aggregate(paymentByInvoicePipeline);
    const invoiceIds = paymentSummary.map(p => p._id).filter(Boolean);

    // Map invoice to project
    const invoices = await InvoiceModel.find({ _id: { $in: invoiceIds } })
      .select("_id projectId")
      .lean();

    const invoiceToProject: Record<string, string> = {};
    invoices.forEach(inv => {
      invoiceToProject[String(inv._id)] = String(inv.projectId);
    });

    const projectRevenue: Record<string, number> = {};
    const projectFees: Record<string, number> = {};

    paymentSummary.forEach(p => {
      const pid = invoiceToProject[String(p._id)];
      if (pid) {
        projectRevenue[pid] = (projectRevenue[pid] || 0) + (p.totalRevenue || 0);
        projectFees[pid] = (projectFees[pid] || 0) + (p.totalFees || 0);
      }
    });

    // 3. Aggregate Expenses per Project directly in DB
    const expenseMatch: any = { isDeleted: { $ne: true } };
    if (startDate) expenseMatch.createdAt = { $gte: startDate };

    const expenseSummary = await ExpenseModel.aggregate([
      { $match: expenseMatch },
      {
        $group: {
          _id: "$projectId",
          totalExpense: { $sum: "$amountBase" }
        }
      }
    ]);

    const projectExpenses: Record<string, number> = {};
    expenseSummary.forEach(ex => {
      if (ex._id) {
        projectExpenses[String(ex._id)] = ex.totalExpense || 0;
      }
    });

    // 4. Time Series Data (monthly buckets aggregated in DB)
    const monthCount = range === "this_month" ? 1 : range === "last_30_days" ? 1 : range === "ytd" ? (now.getMonth() + 1) : 6;
    
    // Revenue Time Series Aggregation
    const revenueMonthly = await PaymentModel.aggregate([
      { $match: paymentMatch },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          total: { $sum: "$receivedAmountBase" }
        }
      }
    ]);

    // Expense Time Series Aggregation
    const expenseMonthly = await ExpenseModel.aggregate([
      { $match: expenseMatch },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          total: { $sum: "$amountBase" }
        }
      }
    ]);

    const revMap: Record<string, number> = {};
    revenueMonthly.forEach(r => {
      if (r._id?.year && r._id?.month) {
        const key = `${r._id.year}-${String(r._id.month).padStart(2, "0")}`;
        revMap[key] = r.total;
      }
    });

    const expMap: Record<string, number> = {};
    expenseMonthly.forEach(e => {
      if (e._id?.year && e._id?.month) {
        const key = `${e._id.year}-${String(e._id.month).padStart(2, "0")}`;
        expMap[key] = e.total;
      }
    });

    const timeSeries = Array.from({ length: monthCount }).map((_, i) => {
      const date = subMonths(now, monthCount - 1 - i);
      const monthStr = format(date, "MMM");
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      return {
        month: monthStr,
        revenue: revMap[key] || 0,
        expenses: expMap[key] || 0
      };
    });

    // 5. Combine into final report
    const items = projects.map((p: any) => {
      const id = String(p._id);
      const revenue = projectRevenue[id] || 0;
      const expenseCosts = projectExpenses[id] || 0;
      const gatewayFees = projectFees[id] || 0;
      const totalCost = expenseCosts + gatewayFees;
      const profit = revenue - totalCost;
      
      return {
        id,
        name: p.name,
        status: p.status,
        currency: p.currency || "AED",
        revenue,
        expenses: expenseCosts,
        fees: gatewayFees,
        totalCost,
        profit,
        profitMargin: revenue > 0 ? (profit / revenue) * 100 : 0,
        createdAt: p.createdAt
      };
    });

    const totals = items.reduce((acc, curr) => ({
      revenue: acc.revenue + curr.revenue,
      expenses: acc.expenses + curr.expenses,
      fees: acc.fees + curr.fees,
      profit: acc.profit + curr.profit
    }), { revenue: 0, expenses: 0, fees: 0, profit: 0 });

    return NextResponse.json({ 
      range,
      items, 
      totals,
      timeSeries
    });
  } catch (error) {
    return authErrorResponse(error, "Failed to load profitability report");
  }
}

