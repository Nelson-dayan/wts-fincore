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
  params: Promise<{ projectId: string }>;
}

export async function GET(_req: Request, ctx: RouteCtx) {
  try {
    await requireRole(["admin"]);
    await connectDB();
    const { projectId } = await ctx.params;

    const project = await ProjectModel.findById(projectId)
      .select("name description status priority budget clientId assignedTo createdAt updatedAt")
      .lean();
    if (!project) {
      return NextResponse.json({ message: "Project not found" }, { status: 404 });
    }

    const [client, quotations, purchaseOrders, invoices] = await Promise.all([
      ClientModel.findById(project.clientId)
        .select(
          "_id name company email address website clientLogoText clientSignatureText"
        )
        .lean(),
      QuotationModel.find({ projectId })
        .select("_id quotationNumber status createdAt")
        .sort({ createdAt: -1 })
        .lean(),
      PurchaseOrderModel.find({ projectId })
        .select("_id poNumber type status createdAt")
        .sort({ createdAt: -1 })
        .lean(),
      InvoiceModel.find({ projectId })
        .select("_id invoiceNumber status dueDate createdAt")
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    return NextResponse.json({ project, client, quotations, purchaseOrders, invoices });
  } catch (error) {
    return authErrorResponse(error, "Failed to load project details");
  }
}
