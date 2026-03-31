import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { authErrorResponse } from "@/lib/api/route-auth";
import { connectDB } from "@/lib/db/connect";
import { PurchaseOrderModel } from "@/lib/db/models";
import { logActivity } from "@/lib/services/activity/log-activity.service";
import mongoose from "mongoose";
import {
  blobToPoDataUrl,
  formFileEntryToBlob,
  validatePoDataUrlString,
} from "@/lib/api/po-upload";

type Ctx = { params: Promise<{ purchaseOrderId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    await requireRole(["admin"]);
    await connectDB();
    const { purchaseOrderId } = await ctx.params;
    if (!mongoose.Types.ObjectId.isValid(purchaseOrderId)) {
      return NextResponse.json({ message: "Invalid purchase order id" }, { status: 400 });
    }
    const raw = await PurchaseOrderModel.findById(purchaseOrderId)
      .populate("quotationId", "quotationNumber")
      .lean();
    if (!raw) {
      return NextResponse.json({ message: "Purchase order not found" }, { status: 404 });
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

    const item = {
      _id: String(raw._id),
      poNumber: raw.poNumber,
      projectId: String(raw.projectId),
      quotationId: quotationRef,
      quotationNumber,
      type: raw.type,
      status: raw.status,
      fileUrl: raw.fileUrl ?? "",
      createdAt,
    };

    return NextResponse.json({ item });
  } catch (error) {
    return authErrorResponse(error, "Failed to load purchase order");
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const session = await requireRole(["admin"]);
    await connectDB();
    const { purchaseOrderId } = await ctx.params;
    if (!mongoose.Types.ObjectId.isValid(purchaseOrderId)) {
      return NextResponse.json({ message: "Invalid purchase order id" }, { status: 400 });
    }

    const ct = (req.headers.get("content-type") ?? "").toLowerCase();
    let externalPoNumber: string | undefined;
    let status: "linked" | "active" | "completed" | undefined;
    let incomingDataUrl = "";
    let incomingUrl = "";

    if (ct.includes("multipart/form-data")) {
      const form = await req.formData();
      if (form.has("externalPoNumber")) {
        externalPoNumber = String(form.get("externalPoNumber") ?? "");
      }
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
      if (body.status && ["linked", "active", "completed"].includes(body.status)) {
        status = body.status;
      }
      incomingDataUrl = String(body.fileDataUrl ?? "").trim();
      incomingUrl = String(body.fileUrl ?? "").trim();
    }

    const po = await PurchaseOrderModel.findById(purchaseOrderId);
    if (!po) {
      return NextResponse.json({ message: "Purchase order not found" }, { status: 404 });
    }

    if (externalPoNumber !== undefined) {
      po.externalPoNumber = externalPoNumber;
    }
    if (status) {
      po.status = status;
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
