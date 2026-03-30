import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { connectDB } from "@/lib/db/connect";
import {
  ClientModel,
  InvoiceModel,
  ProjectModel,
  PurchaseOrderModel,
  QuotationModel,
} from "@/lib/db/models";
import { authErrorResponse } from "@/lib/api/route-auth";

interface RouteCtx {
  params: Promise<{ clientId: string }>;
}

export async function GET(_req: Request, ctx: RouteCtx) {
  try {
    await requireRole(["admin"]);
    await connectDB();
    const { clientId } = await ctx.params;

    const client = await ClientModel.findById(clientId)
      .select(
        "name company email phone website address clientLogoText clientLogoUrl clientSignatureText createdAt updatedAt"
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

    const [quotations, purchaseOrders, invoices] = await Promise.all([
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
    ]);

    return NextResponse.json({ client, projects, quotations, purchaseOrders, invoices });
  } catch (error) {
    return authErrorResponse(error, "Failed to load client details");
  }
}
