import mongoose from "mongoose";
import { requireRole } from "@/lib/auth/require-role";
import { connectDB } from "@/lib/db/connect";
import { PurchaseOrderModel, QuotationModel } from "@/lib/db/models";
import { apiSuccess, apiError } from "@/lib/api/response";
import { executeTransition } from "@/lib/services/orchestration";
import { logActivity } from "@/lib/services/activity/log-activity.service";
import { decimalToNumber } from "@/lib/services/business/money";
import {
  buildQuotationSnapshots,
  computeQuotationTotals,
  normalizePagesInput,
  pagesFromStoredDoc,
  toDecimal128,
} from "@/lib/services/business/quotation.service";
import { assertEmployeeCanAccessProject, assertEmployeeCanAccessQuotation } from "@/lib/auth/employee-resource-access";

interface RouteCtx {
  params: Promise<{ quotationId: string }>;
}

function formatQuotation(quotation: Record<string, unknown>) {
  const totals = quotation.totals as Record<string, unknown> | undefined;
  const pages = quotation.pages as Array<{
    pageNumber: number;
    items: Array<Record<string, unknown>>;
  }> | undefined;
  const quotationInfo = quotation.quotationInfo as Record<string, unknown> | undefined;
  const documentInfoRaw = quotation.documentInfo as Record<string, unknown> | undefined;

  return {
    ...quotation,
    documentInfo: documentInfoRaw
      ? {
          ...documentInfoRaw,
          quotationCode: String(
            documentInfoRaw.quotationCode ?? documentInfoRaw.geCode ?? ""
          ),
        }
      : quotation.documentInfo,
    totals: totals
      ? {
          subtotal: decimalToNumber(totals.subtotal),
          tax: decimalToNumber(totals.tax),
          total: decimalToNumber(totals.total),
        }
      : quotation.totals,
    pages: pages?.map((p) => ({
      ...p,
      items: p.items.map((item) => ({
        ...item,
        price: decimalToNumber(item.price),
      })),
    })),
    quotationInfo: quotationInfo
      ? {
          ...quotationInfo,
          remainingAmount:
            quotationInfo.remainingAmount !== undefined && quotationInfo.remainingAmount !== null
              ? decimalToNumber(quotationInfo.remainingAmount)
              : undefined,
        }
      : quotation.quotationInfo,
  };
}

import { authorizeResource } from "@/lib/auth/authorization";

export async function GET(_req: Request, ctx: RouteCtx) {
  try {
    const { quotationId } = await ctx.params;
    await connectDB();
    const raw = await QuotationModel.findById(quotationId)
      .populate("projectId", "name fixCurrency currency")
      .lean();
    if (!raw) {
      return apiError("Quotation not found", 404);
    }

    const auth = await authorizeResource({
      permission: "quotations.view",
      projectId: String((raw as any).projectId?._id || (raw as any).projectId || ""),
      companyId: (raw as any).companyId ? String((raw as any).companyId) : undefined,
    });

    if (!auth.authorized) {
      return apiError(auth.reason || "Forbidden", 403, auth.code);
    }
    const row = raw as Record<string, unknown>;
    const proj = row.projectId as unknown;
    const projectIdStr =
      proj && typeof proj === "object" && "_id" in proj
        ? String((proj as { _id: unknown })._id)
        : String(row.projectId ?? "");
    const projectName =
      proj && typeof proj === "object" && "name" in proj
        ? String((proj as { name?: string }).name ?? "")
        : "";
    const projectFixCurrency =
      proj && typeof proj === "object" && "fixCurrency" in proj
        ? Boolean((proj as { fixCurrency?: boolean }).fixCurrency)
        : false;
    const projectCurrency =
      proj && typeof proj === "object" && "currency" in proj
        ? String((proj as { currency?: string }).currency ?? "").trim().toUpperCase()
        : "";

    const formatted = formatQuotation({ ...row, projectId: projectIdStr });
    return apiSuccess({ item: { ...formatted, projectName, projectFixCurrency, projectCurrency } });
  } catch (error) {
    console.error("GET Quotation Error:", error);
    return apiError("Failed to load quotation", 500);
  }
}

export async function PATCH(req: Request, ctx: RouteCtx) {
  try {
    const { quotationId } = await ctx.params;
    await connectDB();

    const existing = await QuotationModel.findById(quotationId).lean();
    if (!existing) {
      return apiError("Quotation not found", 404);
    }

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
      refreshSnapshots?: boolean;
      branding?: {
        useCompanyLogo?: boolean;
        useCompanySignature?: boolean;
        showClientSignature?: boolean;
        customLogoText?: string;
        customSignatureText?: string;
      };
      internalNotes?: string;
    };

    const nextProjectId = String(
      body.projectId !== undefined ? body.projectId : existing.projectId
    ).trim();

    const targetStatus = body.status;
    const auth = await authorizeResource({
      permission: targetStatus === "approved" ? "quotations.approve" : targetStatus === "sent" ? "quotations.send" : "quotations.edit",
      projectId: nextProjectId,
      companyId: (existing as any).companyId ? String((existing as any).companyId) : undefined,
      workflowTransition: targetStatus && targetStatus !== existing.status ? {
        resourceType: "quotation",
        fromState: String(existing.status),
        toState: targetStatus,
      } : undefined,
    });

    if (!auth.authorized) {
      return apiError(auth.reason || "Unauthorized to update quotation", 403, auth.code);
    }

    const session = auth.session;
    const shouldRefreshSnapshots =
      Boolean(body.refreshSnapshots) ||
      (body.projectId !== undefined &&
        nextProjectId !== String(existing.projectId));

    let clientSnapshot = existing.clientSnapshot;
    let companySnapshot = existing.companySnapshot;
    if (shouldRefreshSnapshots) {
      const snaps = await buildQuotationSnapshots(nextProjectId);
      clientSnapshot = snaps.clientSnapshot;
      companySnapshot = snaps.companySnapshot;
    }

    const docInfo = existing.documentInfo as Record<string, unknown>;
    const nextDocInfo = {
      quotationCode:
        body.documentInfo?.quotationCode !== undefined
          ? String(body.documentInfo.quotationCode)
          : body.documentInfo?.geCode !== undefined
            ? String(body.documentInfo.geCode)
            : String(docInfo.quotationCode ?? docInfo.geCode ?? ""),
      geCode: "",
      date:
        body.documentInfo?.date !== undefined
          ? new Date(body.documentInfo.date)
          : new Date(String(docInfo.date)),
      subject:
        body.documentInfo?.subject !== undefined
          ? String(body.documentInfo.subject)
          : String(docInfo.subject ?? ""),
      title:
        body.documentInfo?.title !== undefined
          ? String(body.documentInfo.title)
          : String(docInfo.title ?? ""),
      description:
        body.documentInfo?.description !== undefined
          ? String(body.documentInfo.description)
          : String(docInfo.description ?? ""),
      taxRate:
        body.documentInfo?.taxRate !== undefined
          ? Number(body.documentInfo.taxRate)
          : Number(docInfo.taxRate ?? 0),
      taxEnabled:
        body.documentInfo?.taxEnabled !== undefined
          ? Boolean(body.documentInfo.taxEnabled)
          : Boolean(docInfo.taxEnabled),
    };

    if (Number.isNaN(nextDocInfo.date.getTime())) {
      return apiError("Invalid document date", 400);
    }

    const pagesSource =
      body.pages !== undefined
        ? normalizePagesInput(body.pages)
        : pagesFromStoredDoc(existing as { pages?: Array<{ pageNumber: number; items: Array<Record<string, unknown>> }> });

    const { subtotal, tax, total } = computeQuotationTotals(
      pagesSource,
      nextDocInfo.taxRate,
      nextDocInfo.taxEnabled
    );

    const pagesForDb =
      body.pages !== undefined
        ? pagesSource.map((p) => ({
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
          }))
        : undefined;

    const qInfo = existing.quotationInfo as Record<string, unknown> | undefined;
    const bodyQ = body.quotationInfo ?? {};
    const confirmDateRaw =
      bodyQ.confirmDate !== undefined ? String(bodyQ.confirmDate) : undefined;
    const confirmDate =
      confirmDateRaw !== undefined && confirmDateRaw !== ""
        ? new Date(confirmDateRaw)
        : qInfo?.confirmDate
          ? new Date(String(qInfo.confirmDate))
          : undefined;

    const existingBranding = (existing as { branding?: Record<string, unknown> }).branding ?? {};
    const patchB = body.branding;
    const nextBranding =
      patchB !== undefined
        ? {
            useCompanyLogo: patchB.useCompanyLogo !== false,
            useCompanySignature: patchB.useCompanySignature !== false,
            showClientSignature: patchB.showClientSignature !== false,
            customLogoText: String(patchB.customLogoText ?? ""),
            customSignatureText: String(patchB.customSignatureText ?? ""),
          }
        : {
            useCompanyLogo: existingBranding.useCompanyLogo !== false,
            useCompanySignature: existingBranding.useCompanySignature !== false,
            showClientSignature: existingBranding.showClientSignature !== false,
            customLogoText: String(existingBranding.customLogoText ?? ""),
            customSignatureText: String(existingBranding.customSignatureText ?? ""),
          };

    const existingInternal = String((existing as { internalNotes?: string }).internalNotes ?? "");
    const nextInternalNotes =
      body.internalNotes !== undefined ? String(body.internalNotes) : existingInternal;

    if (body.status !== undefined && body.status !== existing.status) {
      let policyId = "";
      let triggerEvent = "QUOTATION_PATCH_UPDATE";

      if (body.status === "approved") {
        policyId = "POL-QTN-001";
        triggerEvent = "QUOTATION_APPROVED_VIA_PATCH";
      } else if (body.status === "sent") {
        policyId = "POL-QTN-002";
        triggerEvent = "QUOTATION_SENT_VIA_PATCH";
      } else if (body.status === "rejected") {
        policyId = "POL-QTN-003";
        triggerEvent = "QUOTATION_REJECTED_VIA_PATCH";
      }

      if (policyId) {
        const result = await executeTransition({
          policyId,
          entityId: quotationId,
          approvedBy: session.user.id,
          triggerEvent,
          route: `/api/admin/quotations/${quotationId}`
        });

        if (!result.success) {
          return apiError(
            result.message || "Quotation transition validation failed.",
            400,
            { blockers: result.blockers }
          );
        }
      } else {
        return apiError(`Direct status transitions to '${body.status}' are prohibited. Policy not defined.`, 400);
      }
    }

    const updated = await QuotationModel.findByIdAndUpdate(
      quotationId,
      {
        $set: {
          projectId: new mongoose.Types.ObjectId(nextProjectId),
          documentInfo: nextDocInfo,
          clientSnapshot,
          companySnapshot,
          ...(pagesForDb ? { pages: pagesForDb } : {}),
          totals: {
            subtotal: toDecimal128(subtotal),
            tax: toDecimal128(tax),
            total: toDecimal128(total),
          },
          quotationInfo: {
            leadTime:
              bodyQ.leadTime !== undefined ? String(bodyQ.leadTime) : String(qInfo?.leadTime ?? ""),
            confirmDate:
              confirmDate && !Number.isNaN(confirmDate.getTime()) ? confirmDate : undefined,
            terms: bodyQ.terms !== undefined ? String(bodyQ.terms) : String(qInfo?.terms ?? ""),
            validity:
              bodyQ.validity !== undefined ? String(bodyQ.validity) : String(qInfo?.validity ?? ""),
            remainingAmount:
              bodyQ.remainingAmount !== undefined
                 ? toDecimal128(Number(bodyQ.remainingAmount))
                 : qInfo?.remainingAmount !== undefined && qInfo?.remainingAmount !== null
                   ? toDecimal128(decimalToNumber(qInfo.remainingAmount))
                   : undefined,
            remainingText:
              bodyQ.remainingText !== undefined
                ? String(bodyQ.remainingText)
                : String(qInfo?.remainingText ?? ""),
          },
          branding: nextBranding,
          internalNotes: nextInternalNotes,
        },
      },
      { new: true }
    ).lean();

    if (!updated) {
      return apiError("Quotation not found", 404);
    }

    await logActivity({
      userId: session.user.id,
      action: existing.status !== body.status && body.status ? "INVOICE_STATUS_CHANGED" : "QUOTATION_UPDATED",
      entityType: "Quotation",
      entityId: String(updated._id),
      message: existing.status !== body.status && body.status
        ? `Quotation ${updated.quotationNumber} status changed from ${existing.status} to ${body.status}`
        : `Updated quotation ${updated.quotationNumber}`,
      projectId: String(updated.projectId),
      metadata: {
        previous: { status: existing.status },
        current: { status: updated.status },
        changedFields: Object.keys(body)
      }
    });

    return apiSuccess({ item: formatQuotation(updated as Record<string, unknown>) });
  } catch (error) {
    console.error("PATCH Quotation Error:", error);
    if (error instanceof Error) {
      const msg = error.message;
      if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
        return apiError("Forbidden", 403);
      }
      if (
        msg.startsWith("At least one page") ||
        msg.startsWith("Each page") ||
        msg.startsWith("Each line item") ||
        msg.startsWith("Quotation has no pages") ||
        msg.startsWith("Project not found") ||
        msg.startsWith("Client not found") ||
        msg.startsWith("Primary company")
      ) {
        return apiError(msg, 400);
      }
    }
    return apiError("Failed to update quotation", 500);
  }
}

export async function DELETE(_req: Request, ctx: RouteCtx) {
  try {
    const { quotationId } = await ctx.params;
    await connectDB();

    const existing = await QuotationModel.findById(quotationId).lean();
    if (!existing) {
      return apiError("Quotation not found", 404);
    }

    const auth = await authorizeResource({
      permission: "quotations.delete",
      projectId: String(existing.projectId),
      companyId: (existing as any).companyId ? String((existing as any).companyId) : undefined,
    });

    if (!auth.authorized) {
      return apiError(auth.reason || "Unauthorized to delete quotation", 403, auth.code);
    }

    const session = auth.session;

    const poCount = await PurchaseOrderModel.countDocuments({
      quotationId: new mongoose.Types.ObjectId(quotationId),
    });
    if (poCount > 0) {
      return apiError(
        "This quotation cannot be deleted because purchase orders are linked to it.",
        400
      );
    }

    const deleted = await QuotationModel.findByIdAndDelete(quotationId).lean();
    if (!deleted) {
      return apiError("Quotation not found", 404);
    }

    await logActivity({
      userId: session.user.id,
      action: "QUOTATION_DELETED",
      entityType: "Quotation",
      entityId: String(deleted._id),
      message: `Deleted quotation ${deleted.quotationNumber}`,
      projectId: String(deleted.projectId),
    });

    return apiSuccess({ ok: true });
  } catch (error) {
    console.error("DELETE Quotation Error:", error);
    return apiError("Failed to delete quotation", 500);
  }
}
