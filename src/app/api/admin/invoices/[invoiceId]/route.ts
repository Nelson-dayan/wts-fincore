import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireRole } from "@/lib/auth/require-role";
import { connectDB } from "@/lib/db/connect";
import { InvoiceModel } from "@/lib/db/models";
import { authErrorResponse } from "@/lib/api/route-auth";
import { logActivity } from "@/lib/services/activity/log-activity.service";
import { formatInvoiceForApi } from "@/lib/services/business/invoice.service";
import { computeInvoiceTotals } from "@/lib/invoice/invoice-totals";
import { aedAmountInWords } from "@/lib/invoice/aed-amount-words";

type Ctx = { params: Promise<{ invoiceId: string }> };

function toDecimal128(value: number): mongoose.Types.Decimal128 {
  const n = Number.isFinite(value) ? value : 0;
  return mongoose.Types.Decimal128.fromString(n.toFixed(4));
}

export async function GET(_req: Request, ctx: Ctx) {
  try {
    await requireRole(["admin"]);
    await connectDB();
    const { invoiceId } = await ctx.params;
    if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
      return NextResponse.json({ message: "Invalid invoice id" }, { status: 400 });
    }
    const raw = await InvoiceModel.findById(invoiceId).lean();
    if (!raw) {
      return NextResponse.json({ message: "Invoice not found" }, { status: 404 });
    }
    const row = raw as unknown as Record<string, unknown>;
    const formatted = formatInvoiceForApi(row);
    return NextResponse.json({ item: formatted });
  } catch (error) {
    return authErrorResponse(error, "Failed to load invoice");
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const session = await requireRole(["admin"]);
    await connectDB();
    const { invoiceId } = await ctx.params;
    if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
      return NextResponse.json({ message: "Invalid invoice id" }, { status: 400 });
    }

    const inv = await InvoiceModel.findById(invoiceId);
    if (!inv) {
      return NextResponse.json({ message: "Invoice not found" }, { status: 404 });
    }

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
          return NextResponse.json({ message: "Invoice number already in use" }, { status: 400 });
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
        if (!Number.isNaN(dt.getTime())) di.date = dt;
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
      const exRate = inv.exchangeRate ? Number(inv.exchangeRate) : 1;
      inv.totalAmountBase = toDecimal128(total * exRate);
      if (inv.totalsCache) {
        inv.totalsCache.totalIntendedBase = toDecimal128(total * exRate);
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
        return NextResponse.json({ message: first || "Validation failed" }, { status: 400 });
      }
      throw err;
    }

    await logActivity({
      userId: session.user.id,
      action: "updated_invoice",
      entityType: "invoice",
      entityId: String(inv._id),
      message: `Updated invoice ${inv.invoiceNumber}`,
      projectId: String(inv.projectId),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN")) {
      return authErrorResponse(error, "Forbidden");
    }
    return authErrorResponse(error, "Failed to update invoice");
  }
}
