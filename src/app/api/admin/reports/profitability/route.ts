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
import { startOfMonth, subMonths, format } from "date-fns";

export async function GET() {
  try {
    await requireRole(["admin"]);
    await connectDB();

    // 1. Fetch all projects
    const projects = await ProjectModel.find({})
      .select("name status budget createdAt")
      .sort({ createdAt: -1 })
      .lean();

    // 2. Aggregate Payments by Project (via Invoices)
    const invoices = await InvoiceModel.find({})
      .select("_id projectId")
      .lean();
    
    const invoiceToProject: Record<string, string> = {};
    invoices.forEach(inv => {
      invoiceToProject[String(inv._id)] = String(inv.projectId);
    });

    const payments = await PaymentModel.find({ status: "COMPLETED" })
      .select("invoiceId receivedAmountBase feesBase createdAt")
      .lean();

    const projectRevenue: Record<string, number> = {};
    const projectFees: Record<string, number> = {};

    payments.forEach((p: any) => {
      const pid = invoiceToProject[String(p.invoiceId)];
      if (pid) {
        projectRevenue[pid] = (projectRevenue[pid] || 0) + (Number(p.receivedAmountBase) || 0);
        projectFees[pid] = (projectFees[pid] || 0) + (Number(p.feesBase) || 0);
      }
    });

    // 3. Aggregate Expenses by Project
    const expenses = await ExpenseModel.find({ isDeleted: { $ne: true } })
      .select("projectId amountBase createdAt")
      .lean();

    const projectExpenses: Record<string, number> = {};
    expenses.forEach((ex: any) => {
      if (ex.projectId) {
        const pid = String(ex.projectId);
        projectExpenses[pid] = (projectExpenses[pid] || 0) + (Number(ex.amountBase) || 0);
      }
    });

    // 4. Time Series Data (Last 6 Months)
    const last6Months = Array.from({ length: 6 }).map((_, i) => {
      const date = subMonths(new Date(), 5 - i);
      return {
        month: format(date, "MMM"),
        date,
        revenue: 0,
        expenses: 0
      };
    });

    payments.forEach((p: any) => {
      const pDate = new Date(p.createdAt);
      last6Months.forEach(m => {
        if (pDate >= startOfMonth(m.date) && pDate < startOfMonth(subMonths(m.date, -1))) {
          m.revenue += (Number(p.receivedAmountBase) || 0);
        }
      });
    });

    expenses.forEach((ex: any) => {
      const exDate = new Date(ex.createdAt);
      last6Months.forEach(m => {
        if (exDate >= startOfMonth(m.date) && exDate < startOfMonth(subMonths(m.date, -1))) {
          m.expenses += (Number(ex.amountBase) || 0);
        }
      });
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
      items, 
      totals,
      timeSeries: last6Months.map(({ month, revenue, expenses }) => ({ month, revenue, expenses }))
    });
  } catch (error) {
    return authErrorResponse(error, "Failed to load profitability report");
  }
}
