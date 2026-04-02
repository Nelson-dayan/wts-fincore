import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireRole } from "@/lib/auth/require-role";
import { connectDB } from "@/lib/db/connect";
import { PurchaseOrderModel, QuotationModel } from "@/lib/db/models";
import { authErrorResponse } from "@/lib/api/route-auth";
import { logActivity } from "@/lib/services/activity/log-activity.service";
import { decimalToNumber } from "@/lib/services/business/money";
import {
  buildQuotationSnapshots,
  computeQuotationTotals,
  normalizePagesInput,
  pagesFromStoredDoc,
  toDecimal128,
} from "@/lib/services/business/quotation.service";

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

export async function GET(_req: Request, ctx: RouteCtx) {
  try {
    await requireRole(["admin"]);
    await connectDB();
    const { quotationId } = await ctx.params;
    const raw = await QuotationModel.findById(quotationId)
      .populate("projectId", "name")
      .lean();
    if (!raw) {
      return NextResponse.json({ message: "Quotation not found" }, { status: 404 });
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
    const formatted = formatQuotation({ ...row, projectId: projectIdStr });
    return NextResponse.json({ item: { ...formatted, projectName } });
  } catch (error) {
    return authErrorResponse(error, "Failed to load quotation");
  }
}

export async function PATCH(req: Request, ctx: RouteCtx) {
  try {
    const session = await requireRole(["admin"]);
    await connectDB();
    const { quotationId } = await ctx.params;
    const existing = await QuotationModel.findById(quotationId).lean();
    if (!existing) {
      return NextResponse.json({ message: "Quotation not found" }, { status: 404 });
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
      return NextResponse.json({ message: "Invalid document date" }, { status: 400 });
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
          ...(body.status !== undefined ? { status: body.status } : {}),
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
      message: `Updated quotation ${updated.quotationNumber}`,
      projectId: String(updated.projectId),
    });

    return NextResponse.json({ item: formatQuotation(updated as Record<string, unknown>) });
  } catch (error) {
    if (error instanceof Error) {
      const msg = error.message;
      if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
        return authErrorResponse(error, "Failed to update quotation");
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
        return NextResponse.json({ message: msg }, { status: 400 });
      }
    }
    return authErrorResponse(error, "Failed to update quotation");
  }
}

export async function DELETE(_req: Request, ctx: RouteCtx) {
  try {
    const session = await requireRole(["admin"]);
    await connectDB();
    const { quotationId } = await ctx.params;

    const poCount = await PurchaseOrderModel.countDocuments({
      quotationId: new mongoose.Types.ObjectId(quotationId),
    });
    if (poCount > 0) {
      return NextResponse.json(
        {
          message:
            "This quotation cannot be deleted because purchase orders are linked to it.",
        },
        { status: 400 }
      );
    }

    const deleted = await QuotationModel.findByIdAndDelete(quotationId).lean();
    if (!deleted) {
      return NextResponse.json({ message: "Quotation not found" }, { status: 404 });
    }

    await logActivity({
      userId: session.user.id,
      action: "deleted_quotation",
      entityType: "quotation",
      entityId: String(deleted._id),
      message: `Deleted quotation ${deleted.quotationNumber}`,
      projectId: String(deleted.projectId),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error, "Failed to delete quotation");
  }
}
