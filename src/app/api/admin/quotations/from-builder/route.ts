import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireRole } from "@/lib/auth/require-role";
import { connectDB } from "@/lib/db/connect";
import { ProjectModel, QuotationModel } from "@/lib/db/models";
import { authErrorResponse } from "@/lib/api/route-auth";
import { logActivity } from "@/lib/services/activity/log-activity.service";
import {
  buildQuotationSnapshots,
  computeQuotationTotals,
  generateQuotationNumber,
  toDecimal128,
} from "@/lib/services/business/quotation.service";
import { pagesFromGeneratorData } from "@/lib/quotation/map-builder-to-quotation";
import { normalizeQuotationData, type QuotationData } from "@/types/quotation-generator";

function pdfBuilderPayload(data: QuotationData) {
  return JSON.parse(JSON.stringify(normalizeQuotationData(data))) as Record<string, unknown>;
}

async function resolveProjectId(params: {
  bodyProjectId?: string;
  quotationId?: string;
}): Promise<{ projectId: string } | { error: string; status: number }> {
  const trimmed = String(params.bodyProjectId ?? "").trim();
  if (trimmed && mongoose.Types.ObjectId.isValid(trimmed)) {
    return { projectId: trimmed };
  }
  const qid = String(params.quotationId ?? "").trim();
  if (qid && mongoose.Types.ObjectId.isValid(qid)) {
    const ex = await QuotationModel.findById(qid).select("projectId").lean();
    if (!ex) return { error: "Quotation not found", status: 404 };
    return { projectId: String(ex.projectId) };
  }
  const first = await ProjectModel.findOne().sort({ createdAt: 1 }).select("_id").lean();
  if (!first?._id) {
    return { error: "No project found. Create a project under Admin first.", status: 400 };
  }
  return { projectId: String(first._id) };
}

/**
 * Persist PDF builder (local) quotation into MongoDB so PO / invoices can link to it.
 * Optional `quotationId` updates the same document (edit mode).
 */
export async function POST(req: Request) {
  try {
    const session = await requireRole(["admin"]);
    await connectDB();
    const body = (await req.json()) as {
      projectId?: string;
      quotationId?: string;
      data?: unknown;
      status?: "draft" | "sent" | "approved" | "rejected";
      taxRate?: number;
      taxEnabled?: boolean;
    };

    const quotationIdRaw = String(body.quotationId ?? "").trim();
    const quotationOid =
      quotationIdRaw && mongoose.Types.ObjectId.isValid(quotationIdRaw)
        ? quotationIdRaw
        : undefined;

    const resolved = await resolveProjectId({
      bodyProjectId: body.projectId,
      quotationId: quotationOid,
    });
    if ("error" in resolved) {
      return NextResponse.json({ message: resolved.error }, { status: resolved.status });
    }
    const projectId = resolved.projectId;

    const data = normalizeQuotationData(body.data);
    const pages = pagesFromGeneratorData(data);
    const taxRate =
      typeof body.taxRate === "number" && Number.isFinite(body.taxRate) ? body.taxRate : 5;
    const taxEnabled = body.taxEnabled !== false;
    const { subtotal, tax, total } = computeQuotationTotals(pages, taxRate, taxEnabled);

    const built = await buildQuotationSnapshots(projectId);
    const clientName = data.clientName.trim();
    const contactName = data.contactName.trim();
    const clientSnapshot = {
      ...built.clientSnapshot,
      company: clientName || built.clientSnapshot.company,
      name: contactName || clientName || built.clientSnapshot.name,
    };
    const companySnapshot = {
      ...built.companySnapshot,
      ...(data.companyName.trim() ? { name: data.companyName.trim() } : {}),
      ...(data.companyAddress.trim() ? { address: data.companyAddress.trim() } : {}),
    };

    let docDate = new Date();
    if (data.date.trim()) {
      const parsed = new Date(data.date);
      if (!Number.isNaN(parsed.getTime())) docDate = parsed;
    }

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

    const pdfBuilderData = pdfBuilderPayload(data);

    const commonSet = {
      documentInfo: {
        quotationCode: data.refNo.trim(),
        geCode: "",
        date: docDate,
        subject: data.page1Title.trim() || data.refNo.trim() || "Quotation",
        title: "QUOTATION",
        description: data.description.trim(),
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
        leadTime: "",
        terms: data.paymentMilestone.trim(),
        validity: "",
        remainingText: "",
      },
      branding: {
        useCompanyLogo: true,
        useCompanySignature: true,
        showClientSignature: false,
        customLogoText: "",
        customSignatureText: "",
      },
      pdfBuilderData,
      status: body.status ?? "sent",
    };

    if (quotationOid) {
      const existing = await QuotationModel.findById(quotationOid).lean();
      if (!existing) {
        return NextResponse.json({ message: "Quotation not found" }, { status: 404 });
      }
      const updated = await QuotationModel.findByIdAndUpdate(
        quotationOid,
        {
          $set: {
            ...commonSet,
            projectId: existing.projectId,
          },
        },
        { new: true }
      ).lean();

      if (!updated) {
        return NextResponse.json({ message: "Quotation not found" }, { status: 404 });
      }

      await logActivity({
        userId: session.user.id,
        action: "updated_quotation",
        entityType: "quotation",
        entityId: String(updated._id),
        message: `Updated quotation ${updated.quotationNumber} (from PDF builder)`,
        projectId: String(updated.projectId),
      });

      return NextResponse.json(
        {
          item: {
            _id: String(updated._id),
            quotationNumber: updated.quotationNumber,
            projectId: String(updated.projectId),
          },
        },
        { status: 200 }
      );
    }

    const quotationNumber = await generateQuotationNumber();
    const created = await QuotationModel.create({
      quotationNumber,
      projectId: new mongoose.Types.ObjectId(projectId),
      createdBy: new mongoose.Types.ObjectId(session.user.id),
      ...commonSet,
      internalNotes: "",
    });

    await logActivity({
      userId: session.user.id,
      action: "created_quotation",
      entityType: "quotation",
      entityId: String(created._id),
      message: `Created quotation ${quotationNumber} (from PDF builder)`,
      projectId,
    });

    return NextResponse.json(
      {
        item: {
          _id: String(created._id),
          quotationNumber: created.quotationNumber,
          projectId: String(created.projectId),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error) {
      const msg = error.message;
      if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
        return authErrorResponse(error, "Forbidden");
      }
      if (
        msg.startsWith("Project not found") ||
        msg.startsWith("Client not found") ||
        msg.startsWith("Primary company")
      ) {
        return NextResponse.json({ message: msg }, { status: 400 });
      }
    }
    return authErrorResponse(error, "Failed to save quotation");
  }
}
