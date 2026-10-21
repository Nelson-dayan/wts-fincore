import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { CompanyModel, PurchaseOrderModel, QuotationModel, ProjectModel } from "@/lib/db/models";
import { apiSuccess, apiError } from "@/lib/api/response";
import { authErrorResponse } from "@/lib/api/route-auth";
import { parsePagination, parseSearch, escapeRegex } from "@/lib/api/pagination";
import { logActivity } from "@/lib/services/activity/log-activity.service";
import { sanitizeObject } from "@/lib/security/sanitize";
import {
  buildQuotationSnapshots,
  computeQuotationTotals,
  generateQuotationNumber,
  normalizePagesInput,
  toDecimal128,
} from "@/lib/services/business/quotation.service";
import mongoose from "mongoose";
import { decimalToNumber } from "@/lib/services/business/money";
import { getEmployeeAssignedProjectIdStrings } from "@/lib/auth/employee-resource-access";
import { updateSequenceReservationEntity } from "@/lib/services/business/counter.service";

import { authorizeResource } from "@/lib/auth/authorization";
import { sanitizeText } from "@/lib/utils/sanitize-input";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const { page, limit, skip } = parsePagination(url.searchParams);
    const q = parseSearch(url.searchParams);

    const targetCompanyId = req.headers.get("x-company-id") || url.searchParams.get("companyId") || undefined;
    const scopeMode = (req.headers.get("x-scope-mode") || url.searchParams.get("scopeMode")) as "single" | "group" || "single";
    const projectId = String(url.searchParams.get("projectId") ?? "").trim() || undefined;

    const auth = await authorizeResource({
      permission: "quotations.view",
      companyId: targetCompanyId,
      projectId,
      requestedScopeMode: scopeMode,
    });

    if (!auth.authorized) {
      return apiError(auth.reason || "Unauthorized to view quotations", 403, auth.code);
    }

    const session = auth.session;
    const companyContext = auth.context;
    await connectDB();

    const primaryCompany = await CompanyModel.findOne({ isPrimary: true, isActive: true, deletedAt: null }).select("_id").lean();
    const isPrimaryActive = primaryCompany && companyContext.allowedCompanyIds.includes(String(primaryCompany._id));

    const filter: Record<string, unknown> = isPrimaryActive
      ? {
          $or: [
            { companyId: { $in: companyContext.allowedCompanyIds } },
            { companyId: { $exists: false } },
            { companyId: null },
          ],
        }
      : { companyId: { $in: companyContext.allowedCompanyIds } };
    if (q) filter.quotationNumber = { $regex: escapeRegex(q), $options: "i" };

    if (session.user.role === "employee") {
      const employeeProjectIds = await getEmployeeAssignedProjectIdStrings(session.user.id);
      if (projectId) {
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
    } else if (projectId) {
      filter.projectId = projectId;
    }
    const [itemsRaw, total] = await Promise.all([
      QuotationModel.find(filter)
        .select("quotationNumber status projectId createdAt totals")
        .populate("projectId", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      QuotationModel.countDocuments(filter),
    ]);
    const quotationIds = itemsRaw.map((r) => r._id as mongoose.Types.ObjectId);
    type PoAgg = { _id: mongoose.Types.ObjectId; count: number; poNumbers: string[] };
    const poAgg: PoAgg[] =
      quotationIds.length === 0
        ? []
        : await PurchaseOrderModel.aggregate([
            { $match: { quotationId: { $in: quotationIds } } },
            {
              $group: {
                _id: "$quotationId",
                count: { $sum: 1 },
                poNumbers: { $push: "$poNumber" },
              },
            },
          ]);
    const poByQuotation = new Map<string, { count: number; poNumbers: string[] }>();
    for (const g of poAgg) {
      const id = String(g._id);
      const nums = (g.poNumbers ?? []).filter(Boolean).slice(0, 8);
      poByQuotation.set(id, { count: g.count ?? 0, poNumbers: nums });
    }
    const items = itemsRaw.map((row) => {
      const proj = row.projectId as unknown;
      const projectIdStr =
        proj && typeof proj === "object" && "_id" in proj
          ? String((proj as { _id: unknown })._id)
          : String(row.projectId ?? "");
      const projectName =
        proj && typeof proj === "object" && "name" in proj
          ? String((proj as { name?: string }).name ?? "")
          : "";
      const qid = String(row._id);
      const poInfo = poByQuotation.get(qid) ?? { count: 0, poNumbers: [] as string[] };
      const totals = row.totals as { total?: unknown } | undefined;
      const totalAmount =
        totals?.total !== undefined && totals?.total !== null
          ? decimalToNumber(totals.total)
          : null;
      return {
        ...row,
        projectId: projectIdStr,
        projectName,
        purchaseOrderCount: poInfo.count,
        purchaseOrderNumbers: poInfo.poNumbers,
        totalAmount,
      }
    });
    return apiSuccess({ items, page, limit, total, hasMore: skip + items.length < total });
  } catch (error: unknown) {
    if (error instanceof Error && ((error as any).statusCode === 400 || error.name === "InvalidQueryParamError" || error.name === "InvalidSearchParameterError")) {
      return apiError(error.message, 400);
    }
    return authErrorResponse(error, "Failed to load quotations");
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = sanitizeObject((await req.json())) as {
      projectId?: string;
      documentInfo?: {
        quotationCode?: string;
        geCode?: string;
        date?: string;
        subject?: string;
        title?: string;
        description?: string;
        taxRate?: number;
        taxEnabled?: boolean;
      };
      pages?: unknown;
      quotationInfo?: {
        leadTime?: string;
        confirmDate?: string;
        terms?: string;
        validity?: string;
        remainingAmount?: number;
        remainingText?: string;
      };
      status?: "draft" | "sent" | "approved" | "rejected";
      branding?: {
        useCompanyLogo?: boolean;
        useCompanySignature?: boolean;
        showClientSignature?: boolean;
        customLogoText?: string;
        customSignatureText?: string;
      };
      currency?: string;
      internalNotes?: string;
      clientSnapshot?: Partial<{
        name: string;
        company: string;
        address: string;
        logoText: string;
        signatureText: string;
      }>;
      companySnapshot?: Partial<{
        name: string;
        address: string;
        email: string;
        website: string;
        logoUrl: string;
        logoText: string;
        signatureText: string;
      }>;
    };

    const projectId = String(body.projectId ?? "").trim();
    if (!projectId) {
      return apiError("projectId is required", 400);
    }
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return apiError("Invalid project id", 400);
    }

    const projectDoc = await ProjectModel.findById(projectId).select("companyId clientId").lean();
    if (!projectDoc) {
      return apiError("Project not found", 404);
    }

    const targetCompanyId = projectDoc.companyId ? String(projectDoc.companyId) : undefined;

    const auth = await authorizeResource({
      permission: "quotations.create",
      projectId,
      companyId: targetCompanyId,
    });

    if (!auth.authorized) {
      return apiError(auth.reason || "Unauthorized to create quotation", 403, auth.code);
    }

    const session = auth.session;
    const companyContext = auth.context;

    const docDate = body.documentInfo?.date
      ? new Date(body.documentInfo.date)
      : new Date();
    if (Number.isNaN(docDate.getTime())) {
      return apiError("Invalid document date", 400);
    }

    const taxRate = Number(body.documentInfo?.taxRate ?? 0);
    const taxEnabled = Boolean(body.documentInfo?.taxEnabled);

    const pages = normalizePagesInput(body.pages);
    const { subtotal, tax, total } = computeQuotationTotals(pages, taxRate, taxEnabled);

    const built = await buildQuotationSnapshots(projectId);
    const cs = body.clientSnapshot ?? {};
    const co = body.companySnapshot ?? {};
    const clientSnapshot = {
      ...built.clientSnapshot,
      ...(cs.name !== undefined ? { name: sanitizeText(cs.name).trim() } : {}),
      ...(cs.company !== undefined ? { company: sanitizeText(cs.company).trim() } : {}),
      ...(cs.address !== undefined ? { address: sanitizeText(cs.address).trim() } : {}),
      ...(cs.logoText !== undefined ? { logoText: sanitizeText(cs.logoText).trim() } : {}),
      ...(cs.signatureText !== undefined ? { signatureText: sanitizeText(cs.signatureText).trim() } : {}),
    };
    const companySnapshot = {
      ...built.companySnapshot,
      ...(co.name !== undefined ? { name: sanitizeText(co.name).trim() } : {}),
      ...(co.address !== undefined ? { address: sanitizeText(co.address).trim() } : {}),
      ...(co.email !== undefined ? { email: String(co.email).trim() } : {}),
      ...(co.website !== undefined ? { website: sanitizeText(co.website).trim() } : {}),
      ...(co.logoUrl !== undefined ? { logoUrl: sanitizeText(co.logoUrl).trim() } : {}),
      ...(co.logoText !== undefined ? { logoText: sanitizeText(co.logoText).trim() } : {}),
      ...(co.signatureText !== undefined ? { signatureText: sanitizeText(co.signatureText).trim() } : {}),
    };
    const { quotationNumber, seqValue, year } = await generateQuotationNumber(session.user.id);

    const pagesForDb = pages.map((p) => ({
      pageNumber: p.pageNumber,
      items: p.items.map((item) => ({
        number: item.number,
        name: sanitizeText(item.name).trim(),
        displayName: sanitizeText(item.displayName ?? "").trim(),
        description: sanitizeText(item.description ?? "").trim(),
        length: item.length,
        width: item.width,
        quantity: item.quantity,
        price: toDecimal128(item.price),
      })),
    }));

    const quotationInfo = body.quotationInfo ?? {};
    const confirmDate =
      quotationInfo.confirmDate !== undefined && quotationInfo.confirmDate !== ""
        ? new Date(String(quotationInfo.confirmDate))
        : undefined;

    const branding = body.branding ?? {};
    const created = await QuotationModel.create({
      quotationNumber,
      companyId: projectDoc.companyId || companyContext.activeCompanyId,
      projectId: new mongoose.Types.ObjectId(projectId),
      createdBy: new mongoose.Types.ObjectId(session.user.id),
      documentInfo: {
        quotationCode: sanitizeText(
          body.documentInfo?.quotationCode ?? body.documentInfo?.geCode ?? ""
        ).trim(),
        geCode: "",
        date: docDate,
        subject: sanitizeText(body.documentInfo?.subject ?? "").trim(),
        title: sanitizeText(body.documentInfo?.title ?? "").trim(),
        description: sanitizeText(body.documentInfo?.description ?? "").trim(),
        taxRate,
        taxEnabled,
      },
      clientSnapshot,
      companySnapshot,
      pages: pagesForDb,
      totals: {
        subtotal: toDecimal128(subtotal),
        tax: toDecimal128(tax),
        total: toDecimal128(total),
      },
      quotationInfo: {
        leadTime: sanitizeText(quotationInfo.leadTime ?? "").trim(),
        confirmDate: confirmDate && !Number.isNaN(confirmDate.getTime()) ? confirmDate : undefined,
        terms: sanitizeText(quotationInfo.terms ?? "").trim(),
        validity: sanitizeText(quotationInfo.validity ?? "").trim(),
        remainingAmount:
          quotationInfo.remainingAmount !== undefined
            ? toDecimal128(Number(quotationInfo.remainingAmount))
            : undefined,
        remainingText: sanitizeText(quotationInfo.remainingText ?? "").trim(),
      },
      branding: {
        useCompanyLogo: branding.useCompanyLogo !== false,
        useCompanySignature: branding.useCompanySignature !== false,
        showClientSignature: branding.showClientSignature !== false,
        customLogoText: sanitizeText(branding.customLogoText ?? "").trim(),
        customSignatureText: sanitizeText(branding.customSignatureText ?? "").trim(),
      },
      internalNotes: sanitizeText(body.internalNotes ?? "").trim(),
      currency: String(body.currency || "").trim() || undefined,
      status: body.status ?? "draft",
    });

    await logActivity({
      userId: session.user.id,
      action: "QUOTATION_CREATED",
      entityType: "Quotation",
      entityId: String(created._id),
      message: `Created quotation ${quotationNumber}`,
      projectId,
    });

    await updateSequenceReservationEntity("quotation_number", year, seqValue, String(created._id));

    return apiSuccess({ item: created }, 201);
  } catch (error) {
    console.error("POST Quotation Error:", error);
    if (error instanceof Error) {
      const msg = error.message;
      if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
        return apiError("Forbidden", 403);
      }
      const clientMsg =
        msg.startsWith("At least one page") ||
        msg.startsWith("Each page") ||
        msg.startsWith("Each line item") ||
        msg.startsWith("Project not found") ||
        msg.startsWith("Client not found") ||
        msg.startsWith("Primary company") ||
        msg.includes("validation")
          ? msg
          : undefined;
      if (clientMsg) {
        return apiError(clientMsg, 400);
      }
    }
    return apiError("Failed to create quotation", 500);
  }
}
