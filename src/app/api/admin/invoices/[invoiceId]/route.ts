import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireRole } from "@/lib/auth/require-role";
import { connectDB } from "@/lib/db/connect";
import { InvoiceModel } from "@/lib/db/models";
import { apiSuccess, apiError } from "@/lib/api/response";
import { executeTransition } from "@/lib/services/orchestration";
import { logActivity } from "@/lib/services/activity/log-activity.service";
import { formatInvoiceForApi } from "@/lib/services/business/invoice.service";
import { computeInvoiceTotals } from "@/lib/invoice/invoice-totals";
import { aedAmountInWords } from "@/lib/invoice/aed-amount-words";
import { assertEmployeeCanAccessInvoice } from "@/lib/auth/employee-resource-access";
import { assertPeriodNotLocked } from "@/lib/services/business/period-lock.service";

import { authorizeResource } from "@/lib/auth/authorization";

type Ctx = { params: Promise<{ invoiceId: string }> };

function toDecimal128(value: number): mongoose.Types.Decimal128 {
  const n = Number.isFinite(value) ? value : 0;
  return mongoose.Types.Decimal128.fromString(n.toFixed(4));
}

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { invoiceId } = await ctx.params;
    if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
      return apiError("Invalid invoice id", 400);
    }
    await connectDB();
    const raw = await InvoiceModel.findById(invoiceId).populate("projectId", "fixCurrency").lean();
    if (!raw) {
      return apiError("Invoice not found", 404);
    }

    const auth = await authorizeResource({
      permission: "invoices.view",
      projectId: String(raw.projectId),
      companyId: (raw as any).companyId ? String((raw as any).companyId) : undefined,
    });

    if (!auth.authorized) {
      return NextResponse.json({ message: auth.reason || "Forbidden", code: auth.code }, { status: 403 });
    }
    const row = raw as unknown as Record<string, unknown>;
    const formatted = formatInvoiceForApi(row);
    return apiSuccess({ item: formatted });
  } catch (error) {
    console.error("GET Invoice Error:", error);
    return apiError("Failed to load invoice", 500);
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const { invoiceId } = await ctx.params;
    if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
      return apiError("Invalid invoice id", 400);
    }
    await connectDB();

    const inv = await InvoiceModel.findById(invoiceId);
    if (!inv) {
      return apiError("Invoice not found", 404);
    }

    const body = (await req.json()) as {
      invoiceNumber?: string;
      invoiceType?: string;
      currency?: string;
      status?: string;
      dueDate?: string;
      documentInfo?: Record<string, unknown>;
      clientSnapshot?: Record<string, unknown>;
      companySnapshot?: Record<string, unknown>;
      pages?: Array<{
        pageNumber: number;
        items: Array<{
          number: number;
          name: string;
          description?: string;
          quantity: number;
          price: number;
        }>;
      }>;
      extras?: Record<string, unknown>;
      branding?: Record<string, unknown>;
    };

    let requiredPermission: "invoices.issue" | "invoices.send" | "invoices.markPaid" | "invoices.void" | "invoices.edit" = "invoices.edit";
    const nextStatusRaw = body.status ? String(body.status).toUpperCase() : undefined;
    if (nextStatusRaw === "ISSUED") requiredPermission = "invoices.issue";
    else if (nextStatusRaw === "SENT") requiredPermission = "invoices.send";
    else if (nextStatusRaw === "PAID") requiredPermission = "invoices.markPaid";
    else if (nextStatusRaw === "CANCELLED" || nextStatusRaw === "VOID") requiredPermission = "invoices.void";

    const auth = await authorizeResource({
      permission: requiredPermission,
      projectId: String(inv.projectId),
      companyId: (inv as any).companyId ? String((inv as any).companyId) : undefined,
      workflowTransition: nextStatusRaw && nextStatusRaw !== inv.status ? {
        resourceType: "invoice",
        fromState: String(inv.status),
        toState: nextStatusRaw,
      } : undefined,
    });

    if (!auth.authorized) {
      return NextResponse.json({ message: auth.reason || "Unauthorized to update invoice", code: auth.code }, { status: 403 });
    }

    const session = auth.session;

    const existingDate = (inv.documentInfo as any)?.date;
    if (existingDate) {
      await assertPeriodNotLocked(existingDate);
    }

    const previousStatus = inv.status;

    if (body.invoiceType !== undefined) {
      const t = String(body.invoiceType).toLowerCase();
      if (["aed", "usd"].includes(t)) {
        inv.invoiceType = t as "aed" | "usd";
      }
    }

    if (body.currency !== undefined) {
      const c = String(body.currency).toUpperCase();
      inv.currency = c;
    }

    if (body.invoiceNumber !== undefined) {
      const next = String(body.invoiceNumber).trim();
      if (next) {
        const clash = await InvoiceModel.findOne({
          invoiceNumber: next,
          _id: { $ne: inv._id },
        }).lean();
        if (clash) {
          return apiError("Invoice number already in use", 400);
        }
        inv.invoiceNumber = next;
      }
    }

    if (body.status) {
      const s = String(body.status).toUpperCase();
      if (s === "UNPAID") inv.status = "DRAFT";
      else if (["DRAFT", "SENT", "PARTIAL", "PAID", "OVERDUE", "CANCELLED"].includes(s)) {
        inv.status = s;
      }
    }

    if (body.dueDate) {
      const d = new Date(body.dueDate);
      if (!Number.isNaN(d.getTime())) inv.dueDate = d;
    }

    if (body.documentInfo && typeof body.documentInfo === "object") {
      const di = inv.documentInfo as Record<string, unknown>;
      const b = body.documentInfo;
      if (b.quotationCode !== undefined) di.quotationCode = String(b.quotationCode ?? "");
      if (b.date !== undefined) {
        const dt = new Date(String(b.date));
        if (!Number.isNaN(dt.getTime())) {
          await assertPeriodNotLocked(dt);
          di.date = dt;
        }
      }
      if (b.subject !== undefined) di.subject = String(b.subject ?? "");
      if (b.title !== undefined) di.title = String(b.title ?? "");
      if (b.description !== undefined) di.description = String(b.description ?? "");
      if (typeof b.taxRate === "number") di.taxRate = b.taxRate;
      if (typeof b.taxEnabled === "boolean") di.taxEnabled = b.taxEnabled;
      inv.markModified("documentInfo");
    }

    if (body.clientSnapshot && typeof body.clientSnapshot === "object") {
      Object.assign(inv.clientSnapshot as object, body.clientSnapshot);
      inv.markModified("clientSnapshot");
    }

    if (body.companySnapshot && typeof body.companySnapshot === "object") {
      Object.assign(inv.companySnapshot as object, body.companySnapshot);
      inv.markModified("companySnapshot");
    }

    if (body.branding && typeof body.branding === "object") {
      Object.assign(inv.branding as object, body.branding);
      inv.markModified("branding");
    }

    if (body.extras && typeof body.extras === "object") {
      if (inv.extras == null) {
        inv.set("extras", {});
      }
      const ex = inv.extras as any;
      for (const [k, v] of Object.entries(body.extras)) {
        if (k === "bankAed" || k === "bankUsd") {
          if (v && typeof v === "object") {
            const rawBank = ex[k] && typeof ex[k] === "object" ? JSON.parse(JSON.stringify(ex[k])) : {};
            const merged = {
              accountName: String((v as any).accountName ?? rawBank.accountName ?? ""),
              accountNo: String((v as any).accountNo ?? rawBank.accountNo ?? ""),
              iban: String((v as any).iban ?? rawBank.iban ?? ""),
              bankName: String((v as any).bankName ?? rawBank.bankName ?? ""),
              swift: String((v as any).swift ?? rawBank.swift ?? ""),
            };
            ex.set(k, merged);
          }
        } else if (v !== undefined) {
          ex.set(k, v);
        }
      }
      inv.markModified("extras");
    }

    if (body.pages && Array.isArray(body.pages)) {
      const docInfo = inv.documentInfo as {
        taxRate?: number;
        taxEnabled?: boolean;
      };
      const taxRate = typeof docInfo.taxRate === "number" ? docInfo.taxRate : 5;
      const taxEnabled = Boolean(docInfo.taxEnabled);

      const flatCalc = body.pages.map((p) => ({
        pageNumber: p.pageNumber,
        items: p.items.map((row) => ({
          number: row.number,
          name: String(row.name ?? "").trim() || "—",
          description: String(row.description ?? ""),
          quantity: Math.max(0, Number(row.quantity) || 0),
          price: Number(row.price) || 0,
        })),
      }));

      const { subtotal, tax, total } = computeInvoiceTotals(flatCalc, taxRate, taxEnabled);

      inv.pages = flatCalc.map((p) => ({
        pageNumber: p.pageNumber,
        items: p.items.map((row) => ({
          number: row.number,
          name: row.name,
          description: row.description,
          quantity: row.quantity,
          price: toDecimal128(row.price),
        })),
      })) as typeof inv.pages;

      inv.totals = {
        subtotal: toDecimal128(subtotal),
        tax: toDecimal128(tax),
        total: toDecimal128(total),
      };
      inv.totalAmountBase = toDecimal128(total);
      if (inv.totalsCache) {
        inv.totalsCache.totalIntendedBase = toDecimal128(total);
      }
      if (inv.extras == null) {
        inv.set("extras", {});
      }
      const ex = inv.extras as { amountInWords?: string };
      if (!body.extras || body.extras.amountInWords === undefined) {
        ex.amountInWords =
          inv.invoiceType === "usd"
            ? `${total.toFixed(2)} US Dollars Only.`
            : aedAmountInWords(total);
      }
      inv.markModified("extras");
      inv.markModified("pages");
      inv.markModified("totals");
    }

    try {
      await inv.save();
    } catch (err) {
      if (err instanceof mongoose.Error.ValidationError) {
        const first = Object.values(err.errors)[0]?.message ?? err.message;
        return apiError(first || "Validation failed", 400);
      }
      throw err;
    }

    if (body.status !== undefined) {
      let nextStatus = String(body.status).toUpperCase();
      if (nextStatus === "UNPAID") nextStatus = "DRAFT";

      if (nextStatus !== previousStatus) {
        let policyId = "";
        let triggerEvent = "INVOICE_PATCH_UPDATE";

        if (nextStatus === "SENT") {
          policyId = "POL-INV-001";
          triggerEvent = "INV_FINALIZED_VIA_PATCH";
        } else if (nextStatus === "PAID") {
          policyId = "POL-INV-002";
          triggerEvent = "INV_PAID_VIA_PATCH";
        } else if (nextStatus === "CANCELLED") {
          policyId = "POL-INV-003";
          triggerEvent = "INV_CANCELLED_VIA_PATCH";
        }

        if (policyId) {
          const result = await executeTransition({
            policyId,
            entityId: invoiceId,
            approvedBy: session.user.id,
            triggerEvent,
            route: `/api/admin/invoices/${invoiceId}`
          });

          if (!result.success) {
            return apiError(
              result.message || "Invoice transition validation failed.",
              400,
              { blockers: result.blockers }
            );
          }
        } else {
          return apiError(
            `Direct status transitions to '${nextStatus}' are prohibited. Policy not defined.`,
            400
          );
        }
      }
    }

    await logActivity({
      userId: session.user.id,
      action: previousStatus !== inv.status ? "INVOICE_STATUS_CHANGED" : "INVOICE_UPDATED",
      entityType: "Invoice",
      entityId: String(inv._id),
      message: previousStatus !== inv.status 
        ? `Invoice ${inv.invoiceNumber} status changed from ${previousStatus} to ${inv.status}`
        : `Updated invoice ${inv.invoiceNumber}`,
      projectId: String(inv.projectId),
      metadata: {
        previous: { status: previousStatus },
        current: { status: inv.status },
        changedFields: Object.keys(body)
      }
    });

    return apiSuccess({ ok: true });
  } catch (error) {
    console.error("PATCH Invoice Error:", error);
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
        return apiError("Forbidden", 403);
      }
      if (error.message.includes("closed accounting period") || error.message.includes("locked")) {
        return apiError(error.message, 400);
      }
    }
    return apiError("Failed to update invoice", 500);
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const { invoiceId } = await ctx.params;
    if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
      return apiError("Invalid invoice id", 400);
    }
    await connectDB();

    const inv = await InvoiceModel.findById(invoiceId);
    if (!inv) {
      return apiError("Invoice not found", 404);
    }

    const auth = await authorizeResource({
      permission: "invoices.delete",
      projectId: String(inv.projectId),
      companyId: (inv as any).companyId ? String((inv as any).companyId) : undefined,
    });

    if (!auth.authorized) {
      return NextResponse.json({ message: auth.reason || "Unauthorized to delete invoice", code: auth.code }, { status: 403 });
    }

    const session = auth.session;

    // Check if period is locked
    const docDate = (inv.documentInfo as any)?.date || inv.dueDate;
    if (docDate) {
      await assertPeriodNotLocked(docDate);
    }

    // Soft delete
    inv.set("isDeleted", true);
    inv.set("deletedAt", new Date());
    await inv.save();

    await logActivity({
      userId: session.user.id,
      action: "INVOICE_DELETED",
      entityType: "Invoice",
      entityId: invoiceId,
      message: `Deleted invoice ${inv.invoiceNumber}`,
      projectId: String(inv.projectId),
    });

    return apiSuccess({ ok: true });
  } catch (error) {
    console.error("DELETE Invoice Error:", error);
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
        return apiError("Forbidden", 403);
      }
      if (error.message.includes("closed accounting period") || error.message.includes("locked")) {
        return apiError(error.message, 400);
      }
    }
    return apiError("Failed to delete invoice", 500);
  }
}
