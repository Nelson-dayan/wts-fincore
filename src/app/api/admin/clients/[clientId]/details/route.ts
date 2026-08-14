import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { authorizeResource } from "@/lib/auth/authorization";
import {
  ClientModel,
  ExpenseModel,
  InvoiceModel,
  ProjectModel,
  PurchaseOrderModel,
  QuotationModel,
} from "@/lib/db/models";
import { decimalToNumber } from "@/lib/services/business/money";
import { authErrorResponse } from "@/lib/api/route-auth";

interface RouteCtx {
  params: Promise<{ clientId: string }>;
}

export async function GET(_req: Request, ctx: RouteCtx) {
  try {
    await connectDB();
    const { clientId } = await ctx.params;

    const existingClient = await ClientModel.findById(clientId).select("companyId").lean();
    if (!existingClient) {
      return NextResponse.json({ message: "Client not found" }, { status: 404 });
    }

    const auth = await authorizeResource({
      permission: "clients.view",
      companyId: existingClient.companyId ? String(existingClient.companyId) : undefined,
      clientId,
    });
    if (!auth.authorized) {
      return authErrorResponse({ message: auth.reason, code: auth.code }, "Access denied");
    }

    const client = await ClientModel.findById(clientId)
      .select(
        "name company email phone website address billingAddress shippingAddress taxId currency paymentTerms country state city zipCode notes clientLogoText clientLogoUrl clientSignatureText createdAt updatedAt"
      )
      .lean();
    if (!client) {
      return NextResponse.json({ message: "Client not found" }, { status: 404 });
    }

    const projects = await ProjectModel.find({ clientId })
      .select("_id name status priority budget createdAt")
      .sort({ createdAt: -1 })
      .lean();
    const projectIds = projects.map((project) => project._id);

    const [quotations, purchaseOrders, invoices, expensesRaw] = await Promise.all([
      QuotationModel.find({ projectId: { $in: projectIds } })
        .select("_id quotationNumber status projectId createdAt")
        .sort({ createdAt: -1 })
        .lean(),
      PurchaseOrderModel.find({ projectId: { $in: projectIds } })
        .select("_id poNumber type status quotationId projectId createdAt")
        .sort({ createdAt: -1 })
        .lean(),
      InvoiceModel.find({ projectId: { $in: projectIds } })
        .select("_id invoiceNumber status dueDate projectId poId createdAt")
        .sort({ createdAt: -1 })
        .lean(),
      projectIds.length === 0
        ? Promise.resolve([])
        : ExpenseModel.find({ projectId: { $in: projectIds }, isDeleted: { $ne: true } })
            .select("_id title amount category projectId createdAt")
            .sort({ createdAt: -1 })
            .lean(),
    ]);

    const projectNameById = new Map(
      projects.map((p) => [String(p._id), String(p.name ?? "")])
    );
    const expenseTotalByProject = new Map<string, number>();
    let expenseTotalAll = 0;
    for (const e of expensesRaw) {
      const amt = decimalToNumber(e.amount);
      expenseTotalAll += amt;
      const pid = String(e.projectId ?? "");
      if (pid) {
        expenseTotalByProject.set(pid, (expenseTotalByProject.get(pid) ?? 0) + amt);
      }
    }

    const projectsWithExpense = projects.map((p) => ({
      ...p,
      expenseTotal: expenseTotalByProject.get(String(p._id)) ?? 0,
    }));

    const expenses = expensesRaw.map((e) => ({
      _id: String(e._id),
      title: e.title,
      amount: decimalToNumber(e.amount),
      category: e.category,
      projectId: String(e.projectId ?? ""),
      projectName: projectNameById.get(String(e.projectId)) ?? "—",
      createdAt: e.createdAt,
    }));

    return NextResponse.json({
      client,
      projects: projectsWithExpense,
      quotations,
      purchaseOrders,
      invoices,
      expenses,
      expenseTotalAll,
    });
  } catch (error) {
    return authErrorResponse(error, "Failed to load client details");
  }
}
