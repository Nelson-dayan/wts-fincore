import { randomBytes } from "node:crypto";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db/connect";
import {
  CompanyModel,
  InvoiceModel,
  PurchaseOrderModel,
  QuotationModel,
} from "@/lib/db/models";
import { aedAmountInWords } from "@/lib/invoice/aed-amount-words";
import { MAX_INVOICES_PER_PURCHASE_ORDER } from "@/lib/invoice/invoice-limits";
import * as invoiceTotals from "@/lib/invoice/invoice-totals";
import { decimalToNumber } from "@/lib/services/business/money";
import { logActivity } from "@/lib/services/activity/log-activity.service";
import { DEFAULT_CURRENCY } from "@/lib/constants/finance";
import { getNextFiscalSequence, updateSequenceReservationEntity } from "@/lib/services/business/counter.service";
import { assertPeriodNotLocked } from "@/lib/services/business/period-lock.service";
import { generateStandardDocumentRef } from "@/lib/utils/document-reference";

export { MAX_INVOICES_PER_PURCHASE_ORDER };

export async function generateUniqueInvoiceNumber(
  userId: string,
  companyCode = "SDT",
  companyId?: string
): Promise<{ invoiceNumber: string; seqValue: number; year: string }> {
  const currentYear = new Date().getFullYear().toString();
  const scopeKey = companyId || companyCode;
  const seqValue = await getNextFiscalSequence("invoice_number", currentYear, "Invoice", userId, undefined, scopeKey);
  const invoiceNumber = generateStandardDocumentRef({ docType: "INV", companyCode, sequence: seqValue });
  return { invoiceNumber, seqValue, year: currentYear };
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

type CompanyDocLean = {
  _id?: any;
  name?: string;
  address?: string;
  email?: string;
  website?: string;
  logoText?: string;
  signatureText?: string;
  defaultTax?: { taxRate?: number; taxEnabled?: boolean };
};

/** Primary company row for invoice defaults (logo lives in `logoText` as data URL). */
async function getPrimaryCompanyForInvoice(): Promise<CompanyDocLean | null> {
  const row = await CompanyModel.findOne({ isPrimary: true })
    .sort({ updatedAt: -1 })
    .lean();
  if (!row) return null;
  return {
    _id: row._id,
    name: row.name,
    address: row.address,
    email: row.email,
    website: row.website,
    logoText: row.logoText,
    signatureText: row.signatureText,
    defaultTax: row.defaultTax,
  };
}

function mergeInvoiceCompanySnapshot(
  quotationSnap: unknown,
  primary: CompanyDocLean | null
): Record<string, string> {
  const q =
    quotationSnap && typeof quotationSnap === "object"
      ? (quotationSnap as Record<string, unknown>)
      : {};
  const s = (v: unknown) => String(v ?? "").trim();

  if (!primary) {
    return {
      name: s(q.name) || "Company",
      address: s(q.address),
      email: s(q.email),
      website: s(q.website),
      logoUrl: s(q.logoUrl),
      logoText: s(q.logoText),
      signatureText: s(q.signatureText),
    };
  }

  const logoFromCompany = s(primary.logoText);
  const logoFromQuote = s(q.logoUrl);
  return {
    name: s(primary.name) || s(q.name) || "Company",
    address: s(primary.address) || s(q.address),
    email: s(primary.email) || s(q.email),
    website: s(primary.website) || s(q.website),
    logoUrl: logoFromCompany || logoFromQuote,
    logoText: s(q.logoText),
    signatureText: s(primary.signatureText) || s(q.signatureText),
  };
}

export interface CreateInvoiceForPoInput {
  poId: string;
  createdBy: string;
  invoiceType?: "aed" | "usd";
}

/** Creates invoice with one empty line prefilled from quotation snapshots. */
export async function createInvoiceForPurchaseOrder(
  input: CreateInvoiceForPoInput
): Promise<{ id: string; invoiceNumber: string; projectId: string }> {
  await connectDB();
  const invoiceType = input.invoiceType === "usd" ? "usd" : "aed";
  if (!mongoose.Types.ObjectId.isValid(input.poId)) {
    throw new Error("Invalid purchase order id");
  }

  // In React strict-mode/dev remounts, the create call can happen twice.
  // Reuse an existing unsaved draft-like invoice for this PO instead of duplicating.
  const existingHidden = await InvoiceModel.findOne({
    poId: new mongoose.Types.ObjectId(input.poId),
    invoiceType,
    lifecycleStatus: "DRAFT_HIDDEN",
  })
    .sort({ createdAt: -1 })
    .lean();
  if (existingHidden) {
    return {
      id: String(existingHidden._id),
      invoiceNumber: String(existingHidden.invoiceNumber ?? ""),
      projectId: String(existingHidden.projectId ?? ""),
    };
  }

  const n = await countInvoicesForPurchaseOrder(input.poId);
  const cap = MAX_INVOICES_PER_PURCHASE_ORDER;
  if (cap !== null && Number.isFinite(cap) && n >= cap) {
    throw new Error(`Maximum ${cap} invoices per purchase order`);
  }

  const po = await PurchaseOrderModel.findById(input.poId).lean();
  if (!po) throw new Error("Purchase order not found");

  const quotation = await QuotationModel.findById(po.quotationId).lean();
  if (!quotation) throw new Error("Quotation not found for this purchase order");

  const primaryCompany = await getPrimaryCompanyForInvoice();
  const companySnapshot = mergeInvoiceCompanySnapshot(
    quotation.companySnapshot,
    primaryCompany
  );

  const companyCode = (primaryCompany as any)?.code || "SDT";
  const { invoiceNumber, seqValue, year } = await generateUniqueInvoiceNumber(input.createdBy, companyCode);
  const invDate = new Date();
  await assertPeriodNotLocked(invDate);
  const due = new Date(invDate);
  due.setUTCDate(due.getUTCDate() + 30);

  const docInfo = quotation.documentInfo as Record<string, unknown> | undefined;
  let taxRate =
    docInfo && typeof docInfo.taxRate === "number" ? docInfo.taxRate : 5;
  let taxEnabled =
    docInfo && typeof docInfo.taxEnabled === "boolean" ? docInfo.taxEnabled : true;
  if (invoiceType === "usd") {
    taxRate = 0;
    taxEnabled = false;
  }

  const pages: invoiceTotals.InvoiceTotalsPage[] = Array.isArray(quotation.pages) && quotation.pages.length > 0 
    ? quotation.pages.map((p: any) => ({
        pageNumber: p.pageNumber || 1,
        items: Array.isArray(p.items) ? p.items.map((it: any) => ({
          number: it.number || 1,
          name: it.name || "Item",
          description: it.description || "",
          quantity: it.quantity || 1,
          price: typeof it.price === "number" ? it.price : (it.price != null && typeof it.price === "object" ? parseFloat(it.price.toString()) : 0)
        })) : []
      }))
    : [
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
    invoiceType,
    lifecycleStatus: "DRAFT_HIDDEN",
    paymentStatus: "UNPAID",
    currency: quotation.currency ?? DEFAULT_CURRENCY,
    companyId: (primaryCompany as any)?._id,
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
    companySnapshot,
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
    totalAmountBase: toDecimal128(total),
    totalsCache: {
      totalReceivedBase: toDecimal128(0),
      totalFeesBase: toDecimal128(0),
      totalIntendedBase: toDecimal128(total),
      overpaidAmountBase: toDecimal128(0),
      version: 0,
    },
    branding: {
      customLogoUrl: "",
      customSignatureUrl: "",
    },
    status: "DRAFT",
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
      footerCurrencyLine: invoiceType === "usd" ? "CURRENCY IN USD" : `CURRENCY IN ${DEFAULT_CURRENCY}`,
      disclaimer:
        "This is an electronically generated invoice, hence does not require signature.",
      amountInWords:
        invoiceType === "usd" ? `${total.toFixed(2)} US Dollars Only.` : `INR ${total.toFixed(2)} Only.`,
      showBankAed: invoiceType === "aed",
      showBankUsd: invoiceType === "usd",
      hideShipping: false,
      _hiddenUntilSaved: true,
    },
  });

  await logActivity({
    userId: input.createdBy,
    action: "INVOICE_CREATED",
    entityType: "Invoice",
    entityId: String(created._id),
    message: `Created invoice ${invoiceNumber} for PO ${po.poNumber}`,
    projectId: String(po.projectId),
    metadata: {
      poId: String(po._id),
      invoiceNumber,
      totalAmount: total
    }
  });

  await updateSequenceReservationEntity("invoice_number", year, seqValue, String(created._id));

  return {
    id: String(created._id),
    invoiceNumber,
    projectId: String(po.projectId),
  };
}

/** Normalize stored invoice pages for API (Decimal128 → number). */
export function formatInvoiceForApi(row: Record<string, unknown>): Record<string, unknown> {
  const invoiceType = row.invoiceType === "usd" ? "usd" : "aed";
  const defaultShowAed = invoiceType === "aed";
  const defaultShowUsd = invoiceType === "usd";
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
    invoiceType,
    currency: String(row.currency || "AED").toUpperCase(),
    createdBy: String(row.createdBy ?? ""),
    status: row.status,
    fixCurrency: !!(row.projectId as any)?.fixCurrency,
    projectId: String((row.projectId as any)?._id ?? row.projectId ?? ""),
    poId: row.poId ? String(row.poId) : "",
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
    totalsCache: row.totalsCache
      ? {
          totalReceivedBase: decimalToNumber((row.totalsCache as any).totalReceivedBase),
          totalFeesBase: decimalToNumber((row.totalsCache as any).totalFeesBase),
          totalIntendedBase: decimalToNumber((row.totalsCache as any).totalIntendedBase),
          overpaidAmountBase: decimalToNumber((row.totalsCache as any).overpaidAmountBase),
        }
      : undefined,
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
    extras: extras
      ? {
          showBankAed: defaultShowAed,
          showBankUsd: defaultShowUsd,
          hideShipping: false,
          ...JSON.parse(JSON.stringify(extras)),
        }
      : {
          showBankAed: defaultShowAed,
          showBankUsd: defaultShowUsd,
          hideShipping: false,
        },
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
