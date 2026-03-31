import { randomBytes } from "node:crypto";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db/connect";
import { InvoiceModel, PurchaseOrderModel, QuotationModel } from "@/lib/db/models";
import { aedAmountInWords } from "@/lib/invoice/aed-amount-words";
import { MAX_INVOICES_PER_PURCHASE_ORDER } from "@/lib/invoice/invoice-limits";
import * as invoiceTotals from "@/lib/invoice/invoice-totals";
import { decimalToNumber } from "@/lib/services/business/money";

export { MAX_INVOICES_PER_PURCHASE_ORDER };

export async function generateUniqueInvoiceNumber(): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const suffix = randomBytes(3).toString("hex").toUpperCase();
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const num = `# SLMEC/INV/${y}/${m}${day}/${suffix}`;
    const exists = await InvoiceModel.exists({ invoiceNumber: num });
    if (!exists) return num;
  }
  throw new Error("Could not generate a unique invoice number");
}

function toDecimal128(value: number): mongoose.Types.Decimal128 {
  const n = Number.isFinite(value) ? value : 0;
  return mongoose.Types.Decimal128.fromString(n.toFixed(4));
}

export async function countInvoicesForPurchaseOrder(poId: string): Promise<number> {
  await connectDB();
  if (!mongoose.Types.ObjectId.isValid(poId)) return 0;
  return InvoiceModel.countDocuments({
    poId: new mongoose.Types.ObjectId(poId),
  });
}

export interface CreateInvoiceForPoInput {
  poId: string;
  createdBy: string;
}

/** Creates invoice with one empty line prefilled from quotation snapshots. */
export async function createInvoiceForPurchaseOrder(
  input: CreateInvoiceForPoInput
): Promise<{ id: string; invoiceNumber: string; projectId: string }> {
  await connectDB();
  const n = await countInvoicesForPurchaseOrder(input.poId);
  if (n >= MAX_INVOICES_PER_PURCHASE_ORDER) {
    throw new Error(`Maximum ${MAX_INVOICES_PER_PURCHASE_ORDER} invoices per purchase order`);
  }

  if (!mongoose.Types.ObjectId.isValid(input.poId)) {
    throw new Error("Invalid purchase order id");
  }

  const po = await PurchaseOrderModel.findById(input.poId).lean();
  if (!po) throw new Error("Purchase order not found");

  const quotation = await QuotationModel.findById(po.quotationId).lean();
  if (!quotation) throw new Error("Quotation not found for this purchase order");

  const invoiceNumber = await generateUniqueInvoiceNumber();
  const invDate = new Date();
  const due = new Date(invDate);
  due.setUTCDate(due.getUTCDate() + 30);

  const docInfo = quotation.documentInfo as Record<string, unknown> | undefined;
  const taxRate =
    docInfo && typeof docInfo.taxRate === "number" ? docInfo.taxRate : 5;
  const taxEnabled =
    docInfo && typeof docInfo.taxEnabled === "boolean" ? docInfo.taxEnabled : true;

  const pages: invoiceTotals.InvoiceTotalsPage[] = [
    {
      pageNumber: 1,
      items: [
        {
          number: 1,
          name: "Description of services / goods",
          description: "",
          quantity: 1,
          price: 0,
        },
      ],
    },
  ];

  const { subtotal, tax, total } = invoiceTotals.computeInvoiceTotals(
    pages,
    taxRate,
    taxEnabled
  );

  const created = await InvoiceModel.create({
    invoiceNumber,
    projectId: po.projectId,
    poId: po._id,
    createdBy: new mongoose.Types.ObjectId(input.createdBy),
    documentInfo: {
      quotationCode: "",
      geCode: "",
      date: invDate,
      subject: "",
      title: "INVOICE",
      description: "",
      taxRate,
      taxEnabled,
    },
    clientSnapshot: quotation.clientSnapshot,
    companySnapshot: quotation.companySnapshot,
    pages: pages.map((p) => ({
      pageNumber: p.pageNumber,
      items: p.items.map((row) => ({
        ...row,
        price: toDecimal128(row.price),
      })),
    })),
    totals: {
      subtotal: toDecimal128(subtotal),
      tax: toDecimal128(tax),
      total: toDecimal128(total),
    },
    branding: {
      customLogoUrl: "",
      customSignatureUrl: "",
    },
    status: "unpaid",
    dueDate: due,
    extras: {
      paymentTerms: "30 DAYS",
      companyTrn: "",
      clientTrn: "",
      shipToCompany: String(
        (quotation.clientSnapshot as { company?: string })?.company ?? ""
      ),
      shipToAddress: String(
        (quotation.clientSnapshot as { address?: string })?.address ?? ""
      ),
      shipToTrn: "",
      poNumberRef: String(po.poNumber ?? ""),
      bankAed: {},
      bankUsd: {},
      footerTerms: "TERM:",
      footerCurrencyLine: "CURRENCY IN AED",
      disclaimer:
        "This is an electronically generated invoice, hence does not require signature.",
      amountInWords: aedAmountInWords(total),
    },
  });

  return {
    id: String(created._id),
    invoiceNumber,
    projectId: String(po.projectId),
  };
}

/** Normalize stored invoice pages for API (Decimal128 → number). */
export function formatInvoiceForApi(row: Record<string, unknown>): Record<string, unknown> {
  const totals = row.totals as Record<string, unknown> | undefined;
  const pages = row.pages as
    | Array<{
        pageNumber: number;
        items: Array<Record<string, unknown>>;
      }>
    | undefined;
  const extras = row.extras as Record<string, unknown> | undefined;
  const docInfo = row.documentInfo as Record<string, unknown> | undefined;
  const diDate = docInfo?.date;

  return {
    _id: String(row._id),
    invoiceNumber: row.invoiceNumber,
    projectId: String(row.projectId ?? ""),
    poId: row.poId ? String(row.poId) : "",
    createdBy: String(row.createdBy ?? ""),
    status: row.status,
    documentInfo: docInfo
      ? {
          ...docInfo,
          date:
            diDate instanceof Date
              ? diDate.toISOString()
              : typeof diDate === "string"
                ? diDate
                : "",
        }
      : {},
    clientSnapshot: row.clientSnapshot ?? {},
    companySnapshot: row.companySnapshot ?? {},
    branding: row.branding ?? {},
    totals: totals
      ? {
          subtotal: decimalToNumber(totals.subtotal),
          tax: decimalToNumber(totals.tax),
          total: decimalToNumber(totals.total),
        }
      : { subtotal: 0, tax: 0, total: 0 },
    pages: pages?.map((p) => ({
      pageNumber: p.pageNumber,
      items: p.items.map((item) => ({
        number: item.number,
        name: item.name,
        description: item.description ?? "",
        quantity: item.quantity,
        price: decimalToNumber(item.price),
      })),
    })),
    extras: extras ? JSON.parse(JSON.stringify(extras)) : {},
    dueDate:
      row.dueDate instanceof Date
        ? row.dueDate.toISOString()
        : String(row.dueDate ?? ""),
    createdAt:
      row.createdAt instanceof Date
        ? row.createdAt.toISOString()
        : row.createdAt,
    updatedAt:
      row.updatedAt instanceof Date
        ? row.updatedAt.toISOString()
        : row.updatedAt,
  };
}
