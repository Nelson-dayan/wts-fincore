import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { connectDB } from "@/lib/db/connect";
import { PurchaseOrderModel, QuotationModel } from "@/lib/db/models";
import { authErrorResponse } from "@/lib/api/route-auth";
import { parsePagination, parseSearch } from "@/lib/api/pagination";
import { logActivity } from "@/lib/services/activity/log-activity.service";
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

export async function GET(req: Request) {
  try {
    const session = await requireRole(["admin", "employee"]);
    await connectDB();
    const url = new URL(req.url);
    const { page, limit, skip } = parsePagination(url.searchParams);
    const q = parseSearch(url.searchParams);
    const projectId = String(url.searchParams.get("projectId") ?? "").trim();
    const filter: Record<string, unknown> = {};
    if (q) filter.quotationNumber = { $regex: q, $options: "i" };

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
      };
    });
    return NextResponse.json({ items, page, limit, total, hasMore: skip + items.length < total });
  } catch (error) {
    return authErrorResponse(error, "Failed to load quotations");
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireRole(["admin"]);
    await connectDB();
    const body = (await req.json()) as {
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
      return NextResponse.json({ message: "projectId is required" }, { status: 400 });
    }

    const docDate = body.documentInfo?.date
      ? new Date(body.documentInfo.date)
      : new Date();
    if (Number.isNaN(docDate.getTime())) {
      return NextResponse.json({ message: "Invalid document date" }, { status: 400 });
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
      ...(cs.name !== undefined ? { name: String(cs.name) } : {}),
      ...(cs.company !== undefined ? { company: String(cs.company) } : {}),
      ...(cs.address !== undefined ? { address: String(cs.address) } : {}),
      ...(cs.logoText !== undefined ? { logoText: String(cs.logoText) } : {}),
      ...(cs.signatureText !== undefined ? { signatureText: String(cs.signatureText) } : {}),
    };
    const companySnapshot = {
      ...built.companySnapshot,
      ...(co.name !== undefined ? { name: String(co.name) } : {}),
      ...(co.address !== undefined ? { address: String(co.address) } : {}),
      ...(co.email !== undefined ? { email: String(co.email) } : {}),
      ...(co.website !== undefined ? { website: String(co.website) } : {}),
      ...(co.logoUrl !== undefined ? { logoUrl: String(co.logoUrl) } : {}),
      ...(co.logoText !== undefined ? { logoText: String(co.logoText) } : {}),
      ...(co.signatureText !== undefined ? { signatureText: String(co.signatureText) } : {}),
    };
    const quotationNumber = await generateQuotationNumber();

    const pagesForDb = pages.map((p) => ({
      pageNumber: p.pageNumber,
      items: p.items.map((item) => ({
        number: item.number,
        name: item.name,
        displayName: item.displayName ?? "",
        description: item.description ?? "",
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
      projectId: new mongoose.Types.ObjectId(projectId),
      createdBy: new mongoose.Types.ObjectId(session.user.id),
      documentInfo: {
        quotationCode: String(
          body.documentInfo?.quotationCode ?? body.documentInfo?.geCode ?? ""
        ),
        geCode: "",
        date: docDate,
        subject: String(body.documentInfo?.subject ?? ""),
        title: String(body.documentInfo?.title ?? ""),
        description: String(body.documentInfo?.description ?? ""),
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
        leadTime: String(quotationInfo.leadTime ?? ""),
        confirmDate: confirmDate && !Number.isNaN(confirmDate.getTime()) ? confirmDate : undefined,
        terms: String(quotationInfo.terms ?? ""),
        validity: String(quotationInfo.validity ?? ""),
        remainingAmount:
          quotationInfo.remainingAmount !== undefined
            ? toDecimal128(Number(quotationInfo.remainingAmount))
            : undefined,
        remainingText: String(quotationInfo.remainingText ?? ""),
      },
      branding: {
        useCompanyLogo: branding.useCompanyLogo !== false,
        useCompanySignature: branding.useCompanySignature !== false,
        showClientSignature: branding.showClientSignature !== false,
        customLogoText: String(branding.customLogoText ?? ""),
        customSignatureText: String(branding.customSignatureText ?? ""),
      },
      internalNotes: String(body.internalNotes ?? ""),
      status: body.status ?? "draft",
    });

    await logActivity({
      userId: session.user.id,
      action: "created_quotation",
      entityType: "quotation",
      entityId: String(created._id),
      message: `Created quotation ${quotationNumber}`,
      projectId,
    });

    return NextResponse.json({ item: created }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      const msg = error.message;
      if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
        return authErrorResponse(error, "Failed to create quotation");
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
        return NextResponse.json({ message: clientMsg }, { status: 400 });
      }
    }
    return authErrorResponse(error, "Failed to create quotation");
  }
}
