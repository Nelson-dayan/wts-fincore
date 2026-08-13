import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireRole } from "@/lib/auth/require-role";
import { connectDB } from "@/lib/db/connect";
import { InvoiceModel, PurchaseOrderModel } from "@/lib/db/models";
import { authErrorResponse } from "@/lib/api/route-auth";
import { parsePagination, parseSearch } from "@/lib/api/pagination";
import { logActivity } from "@/lib/services/activity/log-activity.service";
import { createInvoiceForPurchaseOrder } from "@/lib/services/business/invoice.service";
import { decimalToNumber } from "@/lib/services/business/money";
import { checkOrCreateIdempotency, saveIdempotencySuccess, saveIdempotencyFailed } from "@/lib/services/business/idempotency.service";
import {
  assertEmployeeCanAccessPurchaseOrder,
  getEmployeeAssignedProjectIdStrings,
} from "@/lib/auth/employee-resource-access";

import { authorizeResource } from "@/lib/auth/authorization";
import { CompanyHierarchyService } from "@/lib/services/business/company-hierarchy.service";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const targetCompanyId = req.headers.get("x-company-id") || url.searchParams.get("companyId") || undefined;
    const scopeMode = (req.headers.get("x-scope-mode") || url.searchParams.get("scopeMode")) as "single" | "group" || "single";
    const projectId = String(url.searchParams.get("projectId") ?? "").trim() || undefined;

    const auth = await authorizeResource({
      permission: "invoices.view",
      companyId: targetCompanyId,
      projectId,
      requestedScopeMode: scopeMode,
    });

    if (!auth.authorized) {
      return NextResponse.json({ message: auth.reason || "Unauthorized to view invoices", code: auth.code }, { status: 403 });
    }

    const session = auth.session;
    const companyContext = auth.context;
    await connectDB();
    const { page, limit, skip } = parsePagination(url.searchParams);
    const q = parseSearch(url.searchParams);
    const poId = String(url.searchParams.get("poId") ?? "").trim();

    const filter: Record<string, unknown> = {
      lifecycleStatus: { $ne: "DRAFT_HIDDEN" },
      isDeleted: { $ne: true },
      companyId: { $in: companyContext.allowedCompanyIds },
    };
    if (q) filter.invoiceNumber = { $regex: q, $options: "i" };

    if (session.user.role === "employee") {
      const employeeProjectIds = await getEmployeeAssignedProjectIdStrings(session.user.id);
      if (poId) {
        if (!mongoose.Types.ObjectId.isValid(poId)) {
          return NextResponse.json({ message: "Invalid poId" }, { status: 400 });
        }
        const po = await PurchaseOrderModel.findById(poId).select("projectId").lean();
        const pPid = po?.projectId ? String(po.projectId) : "";
        if (!pPid || !employeeProjectIds.includes(pPid)) {
          return NextResponse.json({ items: [], page, limit, total: 0, hasMore: false });
        }
        filter.poId = new mongoose.Types.ObjectId(poId);
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
      if (poId) {
        if (!mongoose.Types.ObjectId.isValid(poId)) {
          return NextResponse.json({ message: "Invalid poId" }, { status: 400 });
        }
        filter.poId = new mongoose.Types.ObjectId(poId);
      }
    }
    const [rawItems, total] = await Promise.all([
      InvoiceModel.find(filter)
        .select(
          "invoiceNumber invoiceType currency status dueDate projectId poId companyId createdAt totals extras.poNumberRef totalsCache"
        )
        .populate("projectId", "name fixCurrency")
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
        currency: String((row as any).currency || "AED").toUpperCase(),
        status: row.status,
        dueDate: dd instanceof Date ? dd.toISOString() : dd,
        projectId: row.projectId && typeof row.projectId === "object" ? {
          _id: String((row.projectId as any)._id),
          name: String((row.projectId as any).name || "Unnamed Project"),
        } : null,
        poId: row.poId ? String(row.poId) : "",
        companyId: String(row.companyId ?? ""),
        poNumberRef: String(extras?.poNumberRef ?? ""),
        total: decimalToNumber(totals?.total),
        totalsCache: row.totalsCache ? {
          totalIntendedBase: decimalToNumber((row.totalsCache as any).totalIntendedBase),
          totalReceivedBase: decimalToNumber((row.totalsCache as any).totalReceivedBase),
        } : undefined,
        fixCurrency: (row.projectId as any)?.fixCurrency || false,
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
  let idempotencyKey: string | null = null;
  let userId: string = "";
  let isIdempotencyEnabled = false;

  try {
    const session = await requireRole(["admin", "employee"]);
    userId = session.user.id;
    await connectDB();

    const body = (await req.json()) as { poId?: string; invoiceType?: "aed" | "usd" };
    const poId = String(body.poId ?? "").trim();
    const invoiceType = body.invoiceType === "usd" ? "usd" : "aed";

    idempotencyKey = req.headers.get("Idempotency-Key")?.trim() ?? null;
    if (idempotencyKey) {
      try {
        const check = await checkOrCreateIdempotency(
          idempotencyKey,
          userId,
          "/api/admin/invoices",
          body
        );

        if (check.status === "CACHED") {
          return NextResponse.json(check.responseBody, { status: check.responseStatus });
        }
        if (check.status === "IN_PROGRESS") {
          return NextResponse.json({ message: "Request already in progress" }, { status: 409 });
        }
        isIdempotencyEnabled = true;
      } catch (e: any) {
        if (e.message === "IDEMPOTENCY_PAYLOAD_MISMATCH") {
          return NextResponse.json(
            { message: "Idempotency key reused with a different body payload" },
            { status: 409 }
          );
        }
        throw e;
      }
    }

    if (!poId) {
      if (isIdempotencyEnabled) await saveIdempotencyFailed(idempotencyKey!, userId);
      return NextResponse.json({ message: "poId is required" }, { status: 400 });
    }

    const po = await PurchaseOrderModel.findById(poId).select("projectId companyId").lean();
    if (!po?.projectId) {
      if (isIdempotencyEnabled) await saveIdempotencyFailed(idempotencyKey!, userId);
      return NextResponse.json({ message: "Purchase order not found" }, { status: 404 });
    }

    const auth = await authorizeResource({
      permission: "invoices.create",
      projectId: String(po.projectId),
      companyId: (po as any).companyId ? String((po as any).companyId) : undefined,
    });

    if (!auth.authorized) {
      if (isIdempotencyEnabled) await saveIdempotencyFailed(idempotencyKey!, userId);
      return NextResponse.json({ message: auth.reason || "Unauthorized to create invoice", code: auth.code }, { status: 403 });
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

    const resData = { id, invoiceNumber, projectId };
    if (isIdempotencyEnabled) {
      await saveIdempotencySuccess(idempotencyKey!, userId, resData, 201);
    }

    return NextResponse.json(resData, { status: 201 });
  } catch (error) {
    if (isIdempotencyEnabled && idempotencyKey) {
      await saveIdempotencyFailed(idempotencyKey, userId);
    }
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
        msg.startsWith("Could not generate") ||
        msg.includes("closed accounting period") ||
        msg.includes("locked")
      ) {
        return NextResponse.json({ message: msg }, { status: 400 });
      }
    }
    console.error("INVOICE CREATE ERROR:", error);
    return authErrorResponse(error, "Failed to create invoice");
  }
}
