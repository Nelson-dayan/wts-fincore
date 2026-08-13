import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { connectDB } from "@/lib/db/connect";
import { InvoiceModel, PurchaseOrderModel, QuotationModel } from "@/lib/db/models";
import { authErrorResponse } from "@/lib/api/route-auth";
import { parsePagination, parseSearch } from "@/lib/api/pagination";
import { logActivity } from "@/lib/services/activity/log-activity.service";
import {
  createPurchaseOrder,
  generatePONumber,
} from "@/lib/services/business/purchase-order.service";
import { updateSequenceReservationEntity } from "@/lib/services/business/counter.service";
import mongoose from "mongoose";
import {
  blobToPoDataUrl,
  formFileEntryToBlob,
  validatePoDataUrlString,
} from "@/lib/api/po-upload";
import {
  assertEmployeeCanAccessProject,
  getEmployeeAssignedProjectIdStrings,
} from "@/lib/auth/employee-resource-access";

function jsonBodyError() {
  return NextResponse.json(
    {
      message:
        "Request body too large or invalid. Use the upload form and send the file from the browser.",
    },
    { status: 400 }
  );
}

import { authorizeResource } from "@/lib/auth/authorization";
import { CompanyHierarchyService } from "@/lib/services/business/company-hierarchy.service";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const targetCompanyId = req.headers.get("x-company-id") || url.searchParams.get("companyId") || undefined;
    const scopeMode = (req.headers.get("x-scope-mode") || url.searchParams.get("scopeMode")) as "single" | "group" || "single";
    const projectId = String(url.searchParams.get("projectId") ?? "").trim() || undefined;

    const auth = await authorizeResource({
      permission: "purchaseOrders.view",
      companyId: targetCompanyId,
      projectId,
      requestedScopeMode: scopeMode,
    });

    if (!auth.authorized) {
      return NextResponse.json({ message: auth.reason || "Unauthorized to view purchase orders", code: auth.code }, { status: 403 });
    }

    const session = auth.session;
    const companyContext = auth.context;
    await connectDB();
    const { page, limit, skip } = parsePagination(url.searchParams);
    const q = parseSearch(url.searchParams);
    const quotationId = String(url.searchParams.get("quotationId") ?? "").trim();

    const filter: Record<string, unknown> = {
      $or: [
        { companyId: { $in: companyContext.allowedCompanyIds } },
        { companyId: { $exists: false } },
        { companyId: null },
      ],
    };

    if (q) filter.poNumber = { $regex: q, $options: "i" };

    if (session.user.role === "employee") {
      const employeeProjectIds = await getEmployeeAssignedProjectIdStrings(session.user.id);
      if (quotationId) {
        if (!mongoose.Types.ObjectId.isValid(quotationId)) {
          return NextResponse.json({ message: "Invalid quotationId" }, { status: 400 });
        }
        const qdoc = await QuotationModel.findById(quotationId).select("projectId").lean();
        const qPid = qdoc?.projectId ? String(qdoc.projectId) : "";
        if (!qPid || !employeeProjectIds.includes(qPid)) {
          return NextResponse.json({ items: [], page, limit, total: 0, hasMore: false });
        }
        filter.quotationId = new mongoose.Types.ObjectId(quotationId);
      } else if (projectId) {
        if (!employeeProjectIds.includes(projectId)) {
          return NextResponse.json({ items: [], page, limit, total: 0, hasMore: false });
        }
        filter.projectId = projectId;
      } else {
        if (employeeProjectIds.length === 0) {
          return NextResponse.json({ items: [], page, limit, total: 0, hasMore: false });
        }
        filter.projectId = { $in: employeeProjectIds };
      }
    } else {
      if (projectId) filter.projectId = projectId;
      if (quotationId) {
        if (!mongoose.Types.ObjectId.isValid(quotationId)) {
          return NextResponse.json({ message: "Invalid quotationId" }, { status: 400 });
        }
        filter.quotationId = new mongoose.Types.ObjectId(quotationId);
      }
    }
    const [rawItems, total] = await Promise.all([
      PurchaseOrderModel.find(filter)
      .select("_id poNumber type status fileUrl quotationId projectId createdAt")
      .populate("quotationId", "quotationNumber")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
      PurchaseOrderModel.countDocuments(filter),
    ]);

    const poIds = rawItems.map((r) => r._id);
    let invoiceCountByPo = new Map<string, number>();
    if (poIds.length) {
      const agg = await InvoiceModel.aggregate<{ _id: mongoose.Types.ObjectId; c: number }>([
        { $match: { poId: { $in: poIds } } },
        { $group: { _id: "$poId", c: { $sum: 1 } } },
      ]);
      invoiceCountByPo = new Map(agg.map((x) => [String(x._id), x.c]));
    }

    const items = rawItems.map((row) => {
      const qPop = row.quotationId as unknown;
      let quotationIdStr = "";
      let quotationNumber = "";
      if (qPop && typeof qPop === "object" && "_id" in qPop) {
        quotationIdStr = String((qPop as { _id: unknown })._id);
        quotationNumber = String((qPop as { quotationNumber?: string }).quotationNumber ?? "");
      } else {
        quotationIdStr = String(row.quotationId ?? "");
      }
      const idStr = String(row._id);
      return {
        _id: idStr,
        poNumber: row.poNumber,
        type: row.type,
        status: row.status,
        quotationId: quotationIdStr,
        quotationNumber,
        projectId: String(row.projectId ?? ""),
        createdAt: row.createdAt,
        hasFile: Boolean(row.fileUrl && String(row.fileUrl).trim().length > 0),
        invoiceCount: invoiceCountByPo.get(idStr) ?? 0,
      };
    });
    return NextResponse.json({ items, page, limit, total, hasMore: skip + items.length < total });
  } catch (error) {
    return authErrorResponse(error, "Failed to load purchase orders");
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();

    const ct = (req.headers.get("content-type") ?? "").toLowerCase();
    let quotationId = "";
    let typeRaw: string | undefined;
    let externalPoNumber: string | undefined;
    let totalAmount: number | undefined;
    let fileUrl = "";
    let fileDataUrlRaw = "";

    if (ct.includes("multipart/form-data")) {
      const form = await req.formData();
      quotationId = String(form.get("quotationId") ?? "").trim();
      typeRaw = String(form.get("type") ?? "").trim() || undefined;
      externalPoNumber = String(form.get("externalPoNumber") ?? "").trim() || undefined;
      const ta = String(form.get("totalAmount") ?? "").trim();
      if (ta) {
        const n = Number.parseFloat(ta.replace(/,/g, ""));
        if (Number.isFinite(n)) totalAmount = n;
      }
      const filePart = formFileEntryToBlob(form.get("file"));
      if (filePart) {
        const built = await blobToPoDataUrl(filePart.blob, filePart.filename);
        if (!built.ok) {
          return NextResponse.json({ message: built.message }, { status: 400 });
        }
        fileUrl = built.dataUrl;
      }
    } else {
      let body: {
        quotationId?: string;
        type?: "client" | "internal";
        externalPoNumber?: string;
        fileUrl?: string;
        fileDataUrl?: string;
        totalAmount?: number | string | null;
      };
      try {
        body = (await req.json()) as typeof body;
      } catch {
        return jsonBodyError();
      }
      quotationId = String(body.quotationId ?? "").trim();
      typeRaw = body.type;
      externalPoNumber = body.externalPoNumber;
      if (body.totalAmount !== undefined && body.totalAmount !== null && body.totalAmount !== "") {
        const n = Number(
          typeof body.totalAmount === "number"
            ? body.totalAmount
            : String(body.totalAmount).replace(/,/g, "")
        );
        if (Number.isFinite(n)) totalAmount = n;
      }
      fileUrl = String(body.fileUrl ?? "").trim();
      fileDataUrlRaw = String(body.fileDataUrl ?? "").trim();
    }

    if (!quotationId || !mongoose.Types.ObjectId.isValid(quotationId)) {
      return NextResponse.json({ message: "quotationId is required" }, { status: 400 });
    }

    const type: "client" | "internal" = typeRaw === "internal" ? "internal" : "client";
    const externalPoNorm = String(externalPoNumber ?? "").trim();

    if (type === "client") {
      if (fileDataUrlRaw) {
        const checked = validatePoDataUrlString(fileDataUrlRaw);
        if (!checked.ok) {
          return NextResponse.json({ message: checked.message }, { status: 400 });
        }
        fileUrl = checked.dataUrl;
      }
      if (!fileUrl.trim()) {
        return NextResponse.json(
          {
            message: "Attach a PDF or image for a client PO.",
          },
          { status: 400 }
        );
      }
    }

    const quotation = await QuotationModel.findById(quotationId).select("projectId companyId").lean();
    if (!quotation?.projectId) {
      return NextResponse.json({ message: "Quotation not found" }, { status: 404 });
    }
    const projectId = String(quotation.projectId);
    const targetCompanyId = (quotation as any).companyId ? String((quotation as any).companyId) : undefined;

    const auth = await authorizeResource({
      permission: "purchaseOrders.create",
      projectId,
      companyId: targetCompanyId,
    });

    if (!auth.authorized) {
      return NextResponse.json({ message: auth.reason || "Unauthorized to create purchase order", code: auth.code }, { status: 403 });
    }

    const session = auth.session;

    const { poNumber, seqValue, year } = await generatePONumber(session.user.id);
    const { id } = await createPurchaseOrder({
      poNumber,
      projectId,
      quotationId,
      type,
      fileUrl: type === "client" ? fileUrl : "",
      externalPoNumber: externalPoNorm || undefined,
      totalAmount,
      createdBy: session.user.id,
    });

    await logActivity({
      userId: session.user.id,
      action: "created_purchase_order",
      entityType: "purchase_order",
      entityId: id,
      message: `Created purchase order ${poNumber}`,
      projectId,
    });

    await updateSequenceReservationEntity("purchase_order_number", year, seqValue, id);

    /** Client PO file save → mark quotation approved (deal confirmed), unless already rejected. */
    if (type === "client" && fileUrl.trim()) {
      const qdoc = await QuotationModel.findById(quotationId).select("status").lean();
      if (qdoc && qdoc.status !== "rejected") {
        await QuotationModel.updateOne({ _id: quotationId }, { $set: { status: "approved" } });
      }
    }

    return NextResponse.json({ id, poNumber }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      const msg = error.message;
      if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
        return authErrorResponse(error, "Forbidden");
      }
      if (
        msg.startsWith("Quotation") ||
        msg.startsWith("Purchase order") ||
        msg.startsWith("Cannot attach") ||
        msg.startsWith("Internal purchase") ||
        msg.startsWith("Client purchase") ||
        msg.startsWith("generatedFromQuotation") ||
        msg.startsWith("fileUrl")
      ) {
        return NextResponse.json({ message: msg }, { status: 400 });
      }
    }
    return authErrorResponse(error, "Failed to create purchase order");
  }
}
