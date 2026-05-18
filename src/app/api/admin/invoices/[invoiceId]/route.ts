import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireRole } from "@/lib/auth/require-role";
import { connectDB } from "@/lib/db/connect";
import { InvoiceModel } from "@/lib/db/models";
import { apiSuccess, apiError } from "@/lib/api/response";
import { logActivity } from "@/lib/services/activity/log-activity.service";
import { formatInvoiceForApi } from "@/lib/services/business/invoice.service";
import { computeInvoiceTotals } from "@/lib/invoice/invoice-totals";
import { aedAmountInWords } from "@/lib/invoice/aed-amount-words";
import { assertEmployeeCanAccessInvoice } from "@/lib/auth/employee-resource-access";
import { assertPeriodNotLocked } from "@/lib/services/business/period-lock.service";

type Ctx = { params: Promise<{ invoiceId: string }> };

function toDecimal128(value: number): mongoose.Types.Decimal128 {
  const n = Number.isFinite(value) ? value : 0;
  return mongoose.Types.Decimal128.fromString(n.toFixed(4));
}

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const session = await requireRole(["admin", "employee"]);
    await connectDB();
    const { invoiceId } = await ctx.params;
    if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
      return apiError("Invalid invoice id", 400);
    }
    if (session.user.role === "employee") {
      try {
        await assertEmployeeCanAccessInvoice(session.user.id, invoiceId);
      } catch (e) {
        if (e instanceof Error && e.message === "FORBIDDEN") {
          return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }
        if (e instanceof Error && e.message === "NOT_FOUND") {
          return NextResponse.json({ message: "Invoice not found" }, { status: 404 });
        }
        throw e;
      }
    }
    const raw = await InvoiceModel.findById(invoiceId).populate("projectId", "fixCurrency").lean();
    if (!raw) {
      return apiError("Invoice not found", 404);
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
    const session = await requireRole(["admin", "employee"]);
    await connectDB();
    const { invoiceId } = await ctx.params;
    if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
      return apiError("Invalid invoice id", 400);
    }

    if (session.user.role === "employee") {
      try {
        await assertEmployeeCanAccessInvoice(session.user.id, invoiceId);
      } catch (e) {
        if (e instanceof Error && e.message === "FORBIDDEN") {
          return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }
        if (e instanceof Error && e.message === "NOT_FOUND") {
          return NextResponse.json({ message: "Invoice not found" }, { status: 404 });
        }
        throw e;
      }
    }

    const inv = await InvoiceModel.findById(invoiceId);
    if (!inv) {
      return apiError("Invoice not found", 404);
    }

    const existingDate = (inv.documentInfo as any)?.date;
    if (existingDate) {
      await assertPeriodNotLocked(existingDate);
    }

    const previousStatus = inv.status;

    const body = (await req.json()) as {
      invoiceNumber?: string;
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
      const ex = inv.extras as Record<string, unknown>;
      for (const [k, v] of Object.entries(body.extras)) {
        if (k === "bankAed" || k === "bankUsd") {
          if (v && typeof v === "object") {
            ex[k] = { ...(ex[k] as object), ...(v as object) };
          }
        } else if (v !== undefined) {
          ex[k] = v;
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
      ex.amountInWords =
        inv.invoiceType === "usd"
          ? `${total.toFixed(2)} US Dollars Only.`
          : aedAmountInWords(total);
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
