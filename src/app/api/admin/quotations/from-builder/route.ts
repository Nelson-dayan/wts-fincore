import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireRole } from "@/lib/auth/require-role";
import { connectDB } from "@/lib/db/connect";
import { ProjectModel, QuotationModel } from "@/lib/db/models";
import { apiSuccess, apiError } from "@/lib/api/response";
import { logActivity } from "@/lib/services/activity/log-activity.service";

import {
  buildQuotationSnapshots,
  computeQuotationTotals,
  generateQuotationNumber,
  toDecimal128,
} from "@/lib/services/business/quotation.service";
import { pagesFromGeneratorData } from "@/lib/quotation/map-builder-to-quotation";
import { normalizeQuotationData, type QuotationData } from "@/types/quotation-generator";
import {
  assertEmployeeCanAccessProject,
  assertEmployeeCanAccessQuotation,
} from "@/lib/auth/employee-resource-access";

function pdfBuilderPayload(data: QuotationData) {
  return JSON.parse(JSON.stringify(normalizeQuotationData(data))) as Record<string, unknown>;
}

type ClientSnap = {
  name: string;
  company: string;
  address: string;
  logoText: string;
  signatureText: string;
};

type CompanySnap = {
  name: string;
  address: string;
  email: string;
  website: string;
  logoUrl: string;
  logoText: string;
  signatureText: string;
};

function snapshotsFromExistingDoc(existing: Record<string, unknown>): {
  clientSnapshot: ClientSnap;
  companySnapshot: CompanySnap;
} | null {
  const c = existing.clientSnapshot;
  const co = existing.companySnapshot;
  if (!c || typeof c !== "object" || !co || typeof co !== "object") return null;
  const cs = c as Record<string, unknown>;
  const cos = co as Record<string, unknown>;
  return {
    clientSnapshot: {
      name: String(cs.name ?? ""),
      company: String(cs.company ?? ""),
      address: String(cs.address ?? ""),
      logoText: String(cs.logoText ?? ""),
      signatureText: String(cs.signatureText ?? ""),
    },
    companySnapshot: {
      name: String(cos.name ?? ""),
      address: String(cos.address ?? ""),
      email: String(cos.email ?? ""),
      website: String(cos.website ?? ""),
      logoUrl: String(cos.logoUrl ?? ""),
      logoText: String(cos.logoText ?? ""),
      signatureText: String(cos.signatureText ?? ""),
    },
  };
}

function mergeSnapshotsWithForm(
  built: { clientSnapshot: ClientSnap; companySnapshot: CompanySnap },
  data: QuotationData
) {
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
  return { clientSnapshot, companySnapshot };
}

/**
 * Persist PDF builder (local) quotation into MongoDB so PO / invoices can link to it.
 * Optional `quotationId` updates the same document (edit mode).
 */
export async function POST(req: Request) {
  try {
    const session = await requireRole(["admin", "employee"]);
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

    const data = normalizeQuotationData(body.data);
    const pages = pagesFromGeneratorData(data);
    const taxRate = data.taxRate;
    const discount = data.discount;
    const taxEnabled = body.taxEnabled !== false;
    const { subtotal, tax, total } = computeQuotationTotals(pages, taxRate, taxEnabled, discount);

    let projectId: string;
    let snapshotBase: { clientSnapshot: ClientSnap; companySnapshot: CompanySnap };
    let existingForUpdate: Record<string, unknown> | null = null;

    if (quotationOid) {
      const existing = await QuotationModel.findById(quotationOid).lean();
      if (!existing) {
        return apiError("Quotation not found", 404);
      }
      existingForUpdate = existing as Record<string, unknown>;
      projectId = String(existing.projectId);

      const bodyPid = String(body.projectId ?? "").trim();
      if (
        bodyPid &&
        mongoose.Types.ObjectId.isValid(bodyPid) &&
        bodyPid !== projectId
      ) {
        return apiError("Project connection does not match this quotation.", 400);
      }

      const fromDoc = snapshotsFromExistingDoc(existingForUpdate);
      snapshotBase =
        fromDoc ?? (await buildQuotationSnapshots(projectId));
    } else {
      const bodyPid = String(body.projectId ?? "").trim();
      if (!bodyPid || !mongoose.Types.ObjectId.isValid(bodyPid)) {
        return apiError("Connect a project before saving (projectId required).", 400);
      }
      const projExists = await ProjectModel.exists({ _id: bodyPid });
      if (!projExists) {
        return apiError("Project not found", 404);
      }
      projectId = bodyPid;
      snapshotBase = await buildQuotationSnapshots(projectId);
    }

    if (session.user.role === "employee") {
      try {
        if (quotationOid) {
          await assertEmployeeCanAccessQuotation(session.user.id, quotationOid);
        } else {
          await assertEmployeeCanAccessProject(session.user.id, projectId);
        }
      } catch (e) {
        if (e instanceof Error && e.message === "FORBIDDEN") {
          return apiError("Forbidden", 403);
        }
        throw e;
      }
    }

    const { clientSnapshot, companySnapshot } = mergeSnapshotsWithForm(snapshotBase, data);

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
      currency: data.currency,
      discount: data.discount,
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

    if (quotationOid && existingForUpdate) {
      const existingProjectId = existingForUpdate.projectId as mongoose.Types.ObjectId;
      const updated = await QuotationModel.findByIdAndUpdate(
        quotationOid,
        {
          $set: {
            ...commonSet,
            projectId: existingProjectId,
          },
        },
        { new: true }
      ).lean();

      if (!updated) {
        return apiError("Quotation not found", 404);
      }

      await logActivity({
        userId: session.user.id,
        action: "QUOTATION_UPDATED",
        entityType: "Quotation",
        entityId: String(updated._id),
        message: `Updated quotation ${updated.quotationNumber} (from PDF builder)`,
        projectId: String(updated.projectId),
      });

      return apiSuccess({
        item: {
          _id: String(updated._id),
          quotationNumber: updated.quotationNumber,
          projectId: String(updated.projectId),
        },
      });

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
      action: "QUOTATION_CREATED",
      entityType: "Quotation",
      entityId: String(created._id),
      message: `Created quotation ${quotationNumber} (from PDF builder)`,
      projectId,
    });

    return apiSuccess({
      item: {
        _id: String(created._id),
        quotationNumber: created.quotationNumber,
        projectId: String(created.projectId),
      },
    }, 201);
  } catch (error) {
    console.error("POST Quotation Builder Error:", error);
    if (error instanceof Error) {
      const msg = error.message;
      if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
        return apiError("Forbidden", 403);
      }
      if (
        msg.startsWith("Project not found") ||
        msg.startsWith("Client not found") ||
        msg.startsWith("Primary company")
      ) {
        return apiError(msg, 400);
      }
    }
    return apiError("Failed to save quotation", 500);
  }
}
