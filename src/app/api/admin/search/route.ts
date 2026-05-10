import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { 
  ProjectModel, 
  InvoiceModel, 
  ClientModel, 
  PurchaseOrderModel, 
  QuotationModel 
} from "@/lib/db/models";
import { requireRole } from "@/lib/auth/require-role";
import { authErrorResponse } from "@/lib/api/route-auth";

export async function GET(req: Request) {
  try {
    await requireRole(["admin", "employee"]);
    await connectDB();

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();

    if (!q || q.length < 2) {
      return NextResponse.json({ items: [] });
    }

    const regex = new RegExp(q, "i");

    // Parallel search across collections
    const [projects, invoices, clients, pos, quotes] = await Promise.all([
      ProjectModel.find({ name: regex }).limit(5).lean(),
      InvoiceModel.find({ invoiceNumber: regex }).limit(5).lean(),
      ClientModel.find({ 
        $or: [
          { name: regex },
          { company: regex }
        ] 
      }).limit(5).lean(),
      PurchaseOrderModel.find({ poNumber: regex }).limit(5).lean(),
      QuotationModel.find({ quotationNumber: regex }).limit(5).lean()
    ]);

    const items: any[] = [];

    projects.forEach((p: any) => {
      items.push({
        id: p._id,
        type: "Project",
        title: p.name,
        subtitle: `Status: ${p.status || "Active"}`,
        url: `/admin/projects/${p._id}`
      });
    });

    invoices.forEach((i: any) => {
      items.push({
        id: i._id,
        type: "Invoice",
        title: i.invoiceNumber,
        subtitle: `Status: ${i.status} · Total: ${i.total?.toLocaleString()}`,
        url: `/admin/invoices/${i._id}`
      });
    });

    clients.forEach((c: any) => {
      items.push({
        id: c._id,
        type: "Client",
        title: c.name || c.company,
        subtitle: c.email || "No email",
        url: `/admin/clients/${c._id}`
      });
    });

    pos.forEach((p: any) => {
      items.push({
        id: p._id,
        type: "Purchase Order",
        title: p.poNumber,
        subtitle: `Quotation: ${p.quotationNumber || "N/A"}`,
        url: `/admin/purchase-orders` // We don't have individual PO pages, but we can jump to the list or specific tab
      });
    });

    quotes.forEach((q: any) => {
      items.push({
        id: q._id,
        type: "Quotation",
        title: q.quotationNumber,
        subtitle: `Client: ${q.clientSnapshot?.name || "N/A"}`,
        url: `/admin/quotations/${q._id}`
      });
    });

    return NextResponse.json({ items });
  } catch (error) {
    return authErrorResponse(error, "Global search failed");
  }
}
