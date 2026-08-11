import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { QuotationModel, ActivityLogModel, PurchaseOrderModel } from "@/lib/db/models";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const quotation = await QuotationModel.findById(id)
      .populate("companyId", "name code logoUrl taxId baseCurrency branding")
      .populate("projectId", "name code status")
      .lean();

    if (!quotation) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    }

    return NextResponse.json({ quotation });
  } catch (error: any) {
    console.error("Public Quotation GET error:", error);
    return NextResponse.json({ error: "Failed to fetch quotation" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await req.json();

    const { status, clientNote, clientContactName } = body;

    if (!["approved", "rejected"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be 'approved' or 'rejected'." },
        { status: 400 }
      );
    }

    const quotation = await QuotationModel.findById(id);
    if (!quotation) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    }

    if (quotation.status === status) {
      return NextResponse.json({
        success: true,
        message: `Quotation is already ${status}.`,
        quotation,
      });
    }

    quotation.status = status;
    if (clientNote) {
      quotation.internalNotes = quotation.internalNotes
        ? `${quotation.internalNotes}\nClient Note (${clientContactName || "Client"}): ${clientNote}`
        : `Client Note (${clientContactName || "Client"}): ${clientNote}`;
    }
    await quotation.save();

    // Log Activity
    await ActivityLogModel.create({
      companyId: quotation.companyId,
      action: status === "approved" ? "QUOTATION_APPROVED_BY_CLIENT" : "QUOTATION_REJECTED_BY_CLIENT",
      entityType: "Quotation",
      entityId: quotation._id.toString(),
      details: `Quotation ${quotation.quotationNumber} was ${status} by client ${clientContactName || ""}.`,
    });

    // Auto-generate client Purchase Order draft if approved
    if (status === "approved") {
      const existingPO = await PurchaseOrderModel.findOne({ quotationId: quotation._id });
      if (!existingPO) {
        const poCount = await PurchaseOrderModel.countDocuments({ companyId: quotation.companyId });
        const poNumber = `PO-${quotation.quotationNumber.split("-").slice(1).join("-") || poCount + 1}`;

        await PurchaseOrderModel.create({
          poNumber,
          companyId: quotation.companyId,
          projectId: quotation.projectId,
          quotationId: quotation._id,
          type: "client",
          currency: quotation.currency || "AED",
          totalAmount: quotation.totals?.total ? String(quotation.totals.total) : "0",
          totalAmountBase: quotation.totals?.total ? String(quotation.totals.total) : "0",
          status: "active",
          createdBy: quotation.createdBy,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Quotation successfully ${status}.`,
      quotation,
    });
  } catch (error: any) {
    console.error("Public Quotation PATCH error:", error);
    return NextResponse.json({ error: "Failed to update quotation" }, { status: 500 });
  }
}
