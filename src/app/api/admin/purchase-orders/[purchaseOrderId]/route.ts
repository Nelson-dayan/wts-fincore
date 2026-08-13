import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { authErrorResponse } from "@/lib/api/route-auth";
import { connectDB } from "@/lib/db/connect";
import { InvoiceModel, PurchaseOrderModel } from "@/lib/db/models";
import { executeTransition } from "@/lib/services/orchestration";
import { logActivity } from "@/lib/services/activity/log-activity.service";
import mongoose from "mongoose";
import {
  blobToPoDataUrl,
  formFileEntryToBlob,
  validatePoDataUrlString,
} from "@/lib/api/po-upload";
import { assertEmployeeCanAccessPurchaseOrder } from "@/lib/auth/employee-resource-access";
import { convertToBase } from "@/lib/services/finance/exchange.engine";

import { authorizeResource } from "@/lib/auth/authorization";

type Ctx = { params: Promise<{ purchaseOrderId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { purchaseOrderId } = await ctx.params;
    if (!mongoose.Types.ObjectId.isValid(purchaseOrderId)) {
      return NextResponse.json({ message: "Invalid purchase order id" }, { status: 400 });
    }
    await connectDB();
    const raw = await PurchaseOrderModel.findById(purchaseOrderId)
      .populate("quotationId", "quotationNumber")
      .lean();
    if (!raw) {
      return NextResponse.json({ message: "Purchase order not found" }, { status: 404 });
    }

    const auth = await authorizeResource({
      permission: "purchaseOrders.view",
      projectId: String(raw.projectId),
      companyId: (raw as any).companyId ? String((raw as any).companyId) : undefined,
    });

    if (!auth.authorized) {
      return NextResponse.json({ message: auth.reason || "Forbidden", code: auth.code }, { status: 403 });
    }

    const qi = raw.quotationId as unknown;
    let quotationNumber: string | undefined;
    let quotationRef: string;
    if (qi && typeof qi === "object" && "_id" in qi) {
      quotationRef = String((qi as { _id: unknown })._id);
      quotationNumber = String((qi as { quotationNumber?: string }).quotationNumber ?? "");
    } else {
      quotationRef = String(raw.quotationId ?? "");
    }

    const createdAt =
      raw.createdAt instanceof Date ? raw.createdAt.toISOString() : String(raw.createdAt ?? "");

    const rawTotal = raw.totalAmount as unknown;
    let totalAmount: number | null = null;
    if (rawTotal != null && rawTotal !== "") {
      const n =
        typeof rawTotal === "number"
          ? rawTotal
          : Number.parseFloat(String(rawTotal).replace(/[^\d.-]/g, ""));
      if (Number.isFinite(n)) totalAmount = n;
    }

    const item = {
      _id: String(raw._id),
      poNumber: raw.poNumber,
      projectId: String(raw.projectId),
      quotationId: quotationRef,
      quotationNumber,
      type: raw.type,
      status: raw.status,
      fileUrl: raw.fileUrl ?? "",
      externalPoNumber: String(raw.externalPoNumber ?? "").trim(),
      currency: raw.currency ?? "AED",
      totalAmount,
      createdAt,
    };

    return NextResponse.json({ item });
  } catch (error) {
    return authErrorResponse(error, "Failed to load purchase order");
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const { purchaseOrderId } = await ctx.params;
    if (!mongoose.Types.ObjectId.isValid(purchaseOrderId)) {
      return NextResponse.json({ message: "Invalid purchase order id" }, { status: 400 });
    }
    await connectDB();

    const po = await PurchaseOrderModel.findById(purchaseOrderId);
    if (!po) {
      return NextResponse.json({ message: "Purchase order not found" }, { status: 404 });
    }

    const ct = (req.headers.get("content-type") ?? "").toLowerCase();
    let externalPoNumber: string | undefined;
    let status: "linked" | "active" | "completed" | undefined;
    let incomingDataUrl = "";
    let incomingUrl = "";
    let totalAmountInput: string | undefined;

    if (ct.includes("multipart/form-data")) {
      const form = await req.formData();
      if (form.has("externalPoNumber")) {
        externalPoNumber = String(form.get("externalPoNumber") ?? "");
      }
      const tam = String(form.get("totalAmount") ?? "").trim();
      if (tam) totalAmountInput = tam;
      const statusRaw = String(form.get("status") ?? "").trim();
      if (statusRaw && ["linked", "active", "completed"].includes(statusRaw)) {
        status = statusRaw as "linked" | "active" | "completed";
      }
      const filePart = formFileEntryToBlob(form.get("file"));
      if (filePart) {
        const built = await blobToPoDataUrl(filePart.blob, filePart.filename);
        if (!built.ok) {
          return NextResponse.json({ message: built.message }, { status: 400 });
        }
        incomingDataUrl = built.dataUrl;
      }
    } else {
      let body: {
        fileDataUrl?: string;
        fileUrl?: string;
        externalPoNumber?: string;
        totalAmount?: number | string | null;
        status?: "linked" | "active" | "completed";
      };
      try {
        body = (await req.json()) as typeof body;
      } catch {
        return NextResponse.json(
          {
            message:
              "Request body too large or invalid. Use the form to upload the file (multipart upload).",
          },
          { status: 400 }
        );
      }
      if (body.externalPoNumber !== undefined) {
        externalPoNumber = String(body.externalPoNumber ?? "");
      }
      if (body.totalAmount !== undefined && body.totalAmount !== null && body.totalAmount !== "") {
        totalAmountInput = String(body.totalAmount);
      }
      if (body.status && ["linked", "active", "completed"].includes(body.status)) {
        status = body.status;
      }
      incomingDataUrl = String(body.fileDataUrl ?? "").trim();
      incomingUrl = String(body.fileUrl ?? "").trim();
    }

    const targetStatus = status;
    const requiredPermission = targetStatus === "active" ? "purchaseOrders.approve" : "purchaseOrders.edit";

    const auth = await authorizeResource({
      permission: requiredPermission,
      projectId: String(po.projectId),
      companyId: (po as any).companyId ? String((po as any).companyId) : undefined,
      workflowTransition: targetStatus && targetStatus !== po.status ? {
        resourceType: "purchaseOrder",
        fromState: String(po.status),
        toState: targetStatus,
      } : undefined,
    });

    if (!auth.authorized) {
      return NextResponse.json({ message: auth.reason || "Unauthorized to update purchase order", code: auth.code }, { status: 403 });
    }

    const session = auth.session;

    if (externalPoNumber !== undefined) {
      po.externalPoNumber = externalPoNumber.trim();
    }
    if (totalAmountInput !== undefined) {
      const n = Number.parseFloat(String(totalAmountInput).replace(/,/g, ""));
      if (Number.isFinite(n)) {
        po.set("totalAmount", mongoose.Types.Decimal128.fromString(n.toFixed(4)));
        const exRate = po.exchangeRate != null ? Number(po.exchangeRate) : 1;
        po.set("totalAmountBase", mongoose.Types.Decimal128.fromString(convertToBase(n, exRate).toFixed(4)));
      }
    }

    if (incomingDataUrl || incomingUrl) {
      if (po.type !== "client") {
        return NextResponse.json(
          { message: "Only client purchase orders can store a file" },
          { status: 400 }
        );
      }
      let nextUrl = incomingUrl;
      if (incomingDataUrl) {
        const checked = validatePoDataUrlString(incomingDataUrl);
        if (!checked.ok) {
          return NextResponse.json({ message: checked.message }, { status: 400 });
        }
        nextUrl = checked.dataUrl;
      }
      if (!nextUrl) {
        return NextResponse.json({ message: "fileUrl or fileDataUrl required" }, { status: 400 });
      }
      po.fileUrl = nextUrl;
    }

    await po.save();

    if (status !== undefined && status !== po.status) {
      let policyId = "";
      let triggerEvent = "PURCHASE_ORDER_PATCH_UPDATE";

      if (status === "active") {
        policyId = "POL-PO-001";
        triggerEvent = "PO_ACTIVATED_VIA_PATCH";
      } else if (status === "completed") {
        policyId = "POL-PO-002";
        triggerEvent = "PO_COMPLETED_VIA_PATCH";
      }

      if (policyId) {
        const result = await executeTransition({
          policyId,
          entityId: purchaseOrderId,
          approvedBy: session.user.id,
          triggerEvent,
          route: `/api/admin/purchase-orders/${purchaseOrderId}`
        });

        if (!result.success) {
          return NextResponse.json(
            { message: result.message || "Purchase order transition validation failed.", blockers: result.blockers },
            { status: 400 }
          );
        }
      } else {
        return NextResponse.json(
          { message: `Direct status transitions to '${status}' are prohibited. Policy not defined.` },
          { status: 400 }
        );
      }
    }

    await logActivity({
      userId: session.user.id,
      action: "updated_purchase_order",
      entityType: "purchase_order",
      entityId: String(po._id),
      message: `Updated purchase order ${po.poNumber}`,
      projectId: String(po.projectId),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return authErrorResponse(error, "Unauthorized");
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return authErrorResponse(error, "Forbidden");
    }
    return authErrorResponse(error, "Failed to update purchase order");
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const { purchaseOrderId } = await ctx.params;
    if (!mongoose.Types.ObjectId.isValid(purchaseOrderId)) {
      return NextResponse.json({ message: "Invalid purchase order id" }, { status: 400 });
    }
    await connectDB();

    const po = await PurchaseOrderModel.findById(purchaseOrderId).lean();
    if (!po) {
      return NextResponse.json({ message: "Purchase order not found" }, { status: 404 });
    }

    const auth = await authorizeResource({
      permission: "purchaseOrders.delete",
      projectId: String(po.projectId),
      companyId: (po as any).companyId ? String((po as any).companyId) : undefined,
    });

    if (!auth.authorized) {
      return NextResponse.json({ message: auth.reason || "Unauthorized to delete purchase order", code: auth.code }, { status: 403 });
    }

    const session = auth.session;

    const invoiceCount = await InvoiceModel.countDocuments({
      poId: new mongoose.Types.ObjectId(purchaseOrderId),
    });
    if (invoiceCount > 0) {
      return NextResponse.json(
        {
          message:
            "This purchase order has linked invoices. Remove or reassign those invoices before deleting.",
        },
        { status: 400 }
      );
    }

    const deleted = await PurchaseOrderModel.findByIdAndDelete(purchaseOrderId).lean();
    if (!deleted) {
      return NextResponse.json({ message: "Purchase order not found" }, { status: 404 });
    }

    await logActivity({
      userId: session.user.id,
      action: "deleted_purchase_order",
      entityType: "purchase_order",
      entityId: purchaseOrderId,
      message: `Deleted purchase order ${deleted.poNumber}`,
      projectId: String(deleted.projectId),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return authErrorResponse(error, "Unauthorized");
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return authErrorResponse(error, "Forbidden");
    }
    return authErrorResponse(error, "Failed to delete purchase order");
  }
}
