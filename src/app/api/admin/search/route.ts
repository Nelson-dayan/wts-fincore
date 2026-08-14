import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { 
  ProjectModel, 
  InvoiceModel, 
  ClientModel, 
  PurchaseOrderModel, 
  QuotationModel,
  ExpenseModel
} from "@/lib/db/models";
import { authErrorResponse } from "@/lib/api/route-auth";
import { authorizeResource } from "@/lib/auth/authorization";


import { getEmployeeAssignedProjectIdStrings } from "@/lib/auth/employee-resource-access";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();

    if (!q || q.length < 2) {
      return NextResponse.json({ items: [] });
    }

    const targetCompanyId = req.headers.get("x-company-id") || searchParams.get("companyId") || undefined;
    const scopeMode = (req.headers.get("x-scope-mode") || searchParams.get("scopeMode")) as "single" | "group" || "single";

    const auth = await authorizeResource({
      permission: "projects.view",
      companyId: targetCompanyId,
      requestedScopeMode: scopeMode,
    });

    if (!auth.authorized) {
      return NextResponse.json({ items: [] });
    }

    await connectDB();
    const companyContext = auth.context;
    const isSuperAdmin = companyContext.globalRole === "super_admin";
    const isEmployee = companyContext.globalRole === "employee";

    const companyFilter = isSuperAdmin
      ? {}
      : { companyId: { $in: companyContext.allowedCompanyIds } };

    let employeeProjectFilter = {};
    let assignedProjectIds: string[] = [];
    if (isEmployee) {
      assignedProjectIds = await getEmployeeAssignedProjectIdStrings(auth.session.user.id);
      employeeProjectFilter = { projectId: { $in: assignedProjectIds } };
    }

    const regex = new RegExp(q, "i");

    // Parallel search across all primary collections with strict company & employee isolation
    const [projects, invoices, clients, pos, quotes, expenses] = await Promise.all([
      ProjectModel.find({
        ...companyFilter,
        ...(isEmployee ? { _id: { $in: assignedProjectIds } } : {}),
        name: regex,
      }).limit(5).lean(),
      InvoiceModel.find({ 
        ...companyFilter,
        ...employeeProjectFilter,
        $or: [
          { invoiceNumber: regex },
          { status: regex }
        ] 
      }).limit(5).lean(),
      ClientModel.find({ 
        ...companyFilter,
        $or: [
          { name: regex },
          { company: regex },
          { email: regex }
        ] 
      }).limit(5).lean(),
      PurchaseOrderModel.find({ 
        ...companyFilter,
        ...employeeProjectFilter,
        $or: [
          { poNumber: regex },
          { vendorName: regex }
        ] 
      }).limit(5).lean(),
      QuotationModel.find({
        ...companyFilter,
        ...employeeProjectFilter,
        quotationNumber: regex
      }).limit(5).lean(),
      ExpenseModel.find({
        ...companyFilter,
        ...employeeProjectFilter,
        isDeleted: { $ne: true },
        $or: [
          { title: regex },
          { category: regex },
          { vendorName: regex }
        ]
      }).limit(5).lean()
    ]);


    const items: any[] = [];

    projects.forEach((p: any) => {
      items.push({
        id: String(p._id),
        type: "Project",
        title: p.name,
        subtitle: `Status: ${p.status || "Active"} · Budget: ₹${(p.budget || 0).toLocaleString()}`,
        url: `/admin/projects/${p._id}`
      });
    });

    invoices.forEach((i: any) => {
      items.push({
        id: String(i._id),
        type: "Invoice",
        title: i.invoiceNumber,
        subtitle: `Status: ${i.status} · Total: ₹${(i.total || 0).toLocaleString()}`,
        url: `/admin/invoices/${i._id}`
      });
    });

    clients.forEach((c: any) => {
      items.push({
        id: String(c._id),
        type: "Client",
        title: c.name || c.company || "Unnamed Client",
        subtitle: `${c.company ? c.company + " · " : ""}${c.email || "No email"}`,
        url: `/admin/clients/${c._id}`
      });
    });

    pos.forEach((p: any) => {
      items.push({
        id: String(p._id),
        type: "Purchase Order",
        title: p.poNumber,
        subtitle: `Vendor: ${p.vendorName || "N/A"} · Quotation: ${p.quotationNumber || "N/A"}`,
        url: `/admin/purchase-orders`
      });
    });

    quotes.forEach((q: any) => {
      items.push({
        id: String(q._id),
        type: "Quotation",
        title: q.quotationNumber,
        subtitle: `Client: ${q.clientSnapshot?.name || "N/A"}`,
        url: `/admin/quotations/${q._id}`
      });
    });

    expenses.forEach((e: any) => {
      items.push({
        id: String(e._id),
        type: "Expense",
        title: e.title || e.category || "Expense",
        subtitle: `Category: ${e.category || "General"} · Amount: ₹${(e.amountBase || e.amount || 0).toLocaleString()}`,
        url: `/admin/expenses`
      });
    });

    return NextResponse.json({ items });
  } catch (error) {
    return authErrorResponse(error, "Global search failed");
  }
}
