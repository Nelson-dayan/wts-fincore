import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireRole } from "@/lib/auth/require-role";
import { connectDB } from "@/lib/db/connect";
import { InvoiceModel } from "@/lib/db/models";
import { authErrorResponse } from "@/lib/api/route-auth";
import { parsePagination, parseSearch } from "@/lib/api/pagination";
import { logActivity } from "@/lib/services/activity/log-activity.service";
import { createInvoiceForPurchaseOrder } from "@/lib/services/business/invoice.service";
import { decimalToNumber } from "@/lib/services/business/money";

export async function GET(req: Request) {
  try {
    await requireRole(["admin"]);
    await connectDB();
    const url = new URL(req.url);
    const { page, limit, skip } = parsePagination(url.searchParams);
    const q = parseSearch(url.searchParams);
    const projectId = String(url.searchParams.get("projectId") ?? "").trim();
    const poId = String(url.searchParams.get("poId") ?? "").trim();
    const filter: Record<string, unknown> = { "extras._hiddenUntilSaved": { $ne: true } };
    if (q) filter.invoiceNumber = { $regex: q, $options: "i" };
    if (projectId) filter.projectId = projectId;
    if (poId) {
      if (!mongoose.Types.ObjectId.isValid(poId)) {
        return NextResponse.json({ message: "Invalid poId" }, { status: 400 });
      }
      filter.poId = new mongoose.Types.ObjectId(poId);
    }
    const [rawItems, total] = await Promise.all([
      InvoiceModel.find(filter)
        .select(
          "invoiceNumber invoiceType status dueDate projectId poId createdAt totals extras.poNumberRef"
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      InvoiceModel.countDocuments(filter),
    ]);
    const items = rawItems.map((row) => {
      const totals = row.totals as Record<string, unknown> | undefined;
      const extras = row.extras as { poNumberRef?: string } | undefined;
      const dd = row.dueDate;
      return {
        _id: String(row._id),
        invoiceNumber: row.invoiceNumber,
        invoiceType: row.invoiceType === "usd" ? "usd" : "aed",
        status: row.status,
        dueDate: dd instanceof Date ? dd.toISOString() : dd,
        projectId: String(row.projectId ?? ""),
        poId: row.poId ? String(row.poId) : "",
        poNumberRef: String(extras?.poNumberRef ?? ""),
        total: decimalToNumber(totals?.total),
        createdAt:
          row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
      };
    });
    return NextResponse.json({ items, page, limit, total, hasMore: skip + items.length < total });
  } catch (error) {
    return authErrorResponse(error, "Failed to load invoices");
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireRole(["admin"]);
    await connectDB();
    const body = (await req.json()) as { poId?: string; invoiceType?: "aed" | "usd" };
    const poId = String(body.poId ?? "").trim();
    const invoiceType = body.invoiceType === "usd" ? "usd" : "aed";
    if (!poId) {
      return NextResponse.json({ message: "poId is required" }, { status: 400 });
    }

    const { id, invoiceNumber, projectId } = await createInvoiceForPurchaseOrder({
      poId,
      createdBy: session.user.id,
      invoiceType,
    });

    await logActivity({
      userId: session.user.id,
      action: "created_invoice",
      entityType: "invoice",
      entityId: id,
      message: `Created invoice ${invoiceNumber}`,
      projectId,
    });

    return NextResponse.json({ id, invoiceNumber, projectId }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      const msg = error.message;
      if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
        return authErrorResponse(error, "Forbidden");
      }
      if (
        msg.startsWith("Maximum") ||
        msg.startsWith("Purchase order") ||
        msg.startsWith("Quotation") ||
        msg.startsWith("Invalid") ||
        msg.startsWith("Could not generate")
      ) {
        return NextResponse.json({ message: msg }, { status: 400 });
      }
    }
    console.error("INVOICE CREATE ERROR:", error);
    return authErrorResponse(error, "Failed to create invoice");
  }
}
