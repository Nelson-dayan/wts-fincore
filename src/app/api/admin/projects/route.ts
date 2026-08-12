import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { connectDB } from "@/lib/db/connect";
import { 
  ClientModel, 
  ProjectModel, 
  UserModel, 
  PaymentModel, 
  ExpenseModel, 
  InvoiceModel 
} from "@/lib/db/models";
import { authErrorResponse } from "@/lib/api/route-auth";
import { parsePagination, parseSearch } from "@/lib/api/pagination";
import { logActivity } from "@/lib/services/activity/log-activity.service";
import { decimalToNumber } from "@/lib/services/business/money";

import { CompanyHierarchyService } from "@/lib/services/business/company-hierarchy.service";

export async function GET(req: Request) {
  try {
    const session = await requireRole(["admin", "employee"]);
    await connectDB();
    const url = new URL(req.url);
    const { page, limit, skip } = parsePagination(url.searchParams);
    const q = parseSearch(url.searchParams);
    const clientId = String(url.searchParams.get("clientId") ?? "").trim();
    const targetCompanyId = req.headers.get("x-company-id") || url.searchParams.get("companyId");
    const scopeMode = (req.headers.get("x-scope-mode") || url.searchParams.get("scopeMode")) as "single" | "group" || "single";

    const companyContext = await CompanyHierarchyService.resolveCompanyContext(targetCompanyId, scopeMode);

    const filter: Record<string, unknown> = {};
    if (companyContext.activeCompany?.isPrimary) {
      filter.$or = [
        { companyId: { $in: companyContext.allowedCompanyIds } },
        { companyId: { $exists: false } },
        { companyId: null },
      ];
    } else {
      filter.companyId = { $in: companyContext.allowedCompanyIds };
    }

    if (q) filter.name = { $regex: q, $options: "i" };
    if (clientId) filter.clientId = clientId;
    if (session.user.role === "employee") {
      filter.assignedTo = session.user.id;
    }

    const [itemsRaw, total] = await Promise.all([
      ProjectModel.find(filter)
        .select("name status priority budget currency category clientReference startDate targetEndDate actualEndDate createdAt clientId")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ProjectModel.countDocuments(filter),
    ]);

    // Financial Enrichment (Parallel)
    const projectIds = itemsRaw.map(p => p._id);
    const [invoices, expenses] = await Promise.all([
      InvoiceModel.find({ projectId: { $in: projectIds } }).select("_id projectId").lean(),
      ExpenseModel.find({ projectId: { $in: projectIds }, isDeleted: { $ne: true } }).select("projectId amountBase").lean()
    ]);

    const invoiceToProject: Record<string, string> = {};
    invoices.forEach(inv => invoiceToProject[String(inv._id)] = String(inv.projectId));

    const payments = await PaymentModel.find({ 
      invoiceId: { $in: invoices.map(i => i._id) },
      status: "COMPLETED" 
    }).select("invoiceId receivedAmountBase feesBase").lean();

    const revenueByProject: Record<string, number> = {};
    const costByProject: Record<string, number> = {};

    payments.forEach(p => {
      const pid = invoiceToProject[String(p.invoiceId)];
      if (pid) {
        revenueByProject[pid] = (revenueByProject[pid] || 0) + decimalToNumber(p.receivedAmountBase);
        costByProject[pid] = (costByProject[pid] || 0) + decimalToNumber(p.feesBase);
      }
    });

    expenses.forEach(ex => {
      const pid = String(ex.projectId);
      costByProject[pid] = (costByProject[pid] || 0) + decimalToNumber((ex as any).amountBase || (ex as any).amount);
    });

    const items = itemsRaw.map((item) => {
      const pid = String(item._id);
      const revenue = revenueByProject[pid] || 0;
      const cost = costByProject[pid] || 0;
      const profit = revenue - cost;
      
      return {
        ...item,
        budget: typeof item.budget === "object" && item.budget !== null
            ? Number.parseFloat(String(item.budget))
            : item.budget,
        revenue,
        cost,
        profit,
        profitMargin: revenue > 0 ? (profit / revenue) * 100 : 0
      };
    });

    return NextResponse.json({ items, page, limit, total, hasMore: skip + items.length < total });
  } catch (error) {
    return authErrorResponse(error, "Failed to load projects");
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireRole(["admin"]);
    await connectDB();
    const body = (await req.json()) as any;
    const name = String(body.name ?? "").trim();
    const clientId = String(body.clientId ?? "").trim();
    if (!name || !clientId) {
      return NextResponse.json(
        { message: "Project name and clientId are required" },
        { status: 400 }
      );
    }

    const clientExists = await ClientModel.exists({ _id: clientId });
    if (!clientExists) {
      return NextResponse.json({ message: "Client not found" }, { status: 404 });
    }
    
    const assignedUserIds: string[] = Array.isArray(body.assignedTo) && body.assignedTo.length > 0
      ? body.assignedTo
      : [session.user.id];

    const defaultPermissions = {
      quotations: { view: true, create: true, edit: true, delete: false },
      purchaseOrders: { view: true, create: true, edit: true, delete: false },
      invoices: { view: true, create: true, edit: true, delete: false },
      expenses: { view: true, create: true, edit: true, delete: false },
      projectDetails: { view: true, edit: true },
    };

    const assignedMembers = Array.isArray(body.assignedMembers) && body.assignedMembers.length > 0
      ? body.assignedMembers
      : assignedUserIds.map((uid) => ({
          userId: uid,
          rolePreset: "editor",
          permissions: defaultPermissions,
        }));

    const url = new URL(req.url);
    const targetCompanyId = req.headers.get("x-company-id") || url.searchParams.get("companyId");
    const companyContext = await CompanyHierarchyService.resolveCompanyContext(targetCompanyId, "single");

    const created = await ProjectModel.create({
      name,
      companyId: companyContext.companyId,
      description: String(body.description ?? ""),
      clientId,
      assignedTo: assignedUserIds,
      assignedMembers,
      status: body.status ?? "active",
      priority: body.priority ?? "medium",
      budget: body.budget,
      currency: String(body.currency ?? "AED").trim().toUpperCase(),
      category: String(body.category ?? "Fixed Price").trim(),
      clientReference: String(body.clientReference ?? "").trim(),
      notes: String(body.notes ?? "").trim(),
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      targetEndDate: body.targetEndDate ? new Date(body.targetEndDate) : undefined,
      actualEndDate: body.actualEndDate ? new Date(body.actualEndDate) : undefined,
    });

    await logActivity({
      userId: session.user.id,
      action: "created_project",
      entityType: "project",
      entityId: String(created._id),
      message: `Created project ${created.name}`,
      projectId: String(created._id),
    });

    return NextResponse.json({ item: created }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error, "Failed to create project");
  }
}
