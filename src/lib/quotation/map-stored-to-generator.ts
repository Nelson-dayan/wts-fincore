import { defaultQuotationData, normalizeQuotationData, type QuotationData } from "@/types/quotation-generator";
/** API item shape from GET /api/admin/quotations/[id] (rough) */
type StoredQuotationItem = {
  pdfBuilderData?: unknown;
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
  clientSnapshot?: Record<string, string | undefined>;
  companySnapshot?: Record<string, string | undefined>;
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
  quotationInfo?: { terms?: string };
};

function formatMoney(n: number): string {
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

/** Round-trip from DB when `pdfBuilderData` was saved; else best-effort from admin quotation fields. */
export function quotationItemToGeneratorData(item: StoredQuotationItem): QuotationData {
  if (item.pdfBuilderData && typeof item.pdfBuilderData === "object") {
    return normalizeQuotationData(item.pdfBuilderData);
  }

  const base = defaultQuotationData();
  const doc = item.documentInfo ?? {};
  const rawDate = doc.date ? new Date(String(doc.date)) : null;
  const dateStr =
    rawDate && !Number.isNaN(rawDate.getTime())
      ? rawDate.toISOString().slice(0, 10)
      : "";

  const client = item.clientSnapshot ?? {};
  const company = item.companySnapshot ?? {};
  const page0 = item.pages?.[0];
  const rows = page0?.items?.length
    ? page0.items.map((it) => ({
        detail: String(it.name ?? "").trim() || String(it.description ?? "").trim(),
        cost: formatMoney(Number(it.price) || 0),
      }))
    : base.items;

  return normalizeQuotationData({
    ...base,
    page1Title: String(doc.subject ?? "").trim(),
    clientName: String(client.company ?? client.name ?? "").trim(),
    refNo: String(doc.quotationCode ?? doc.geCode ?? "").trim(),
    date: dateStr,
    companyName: String(company.name ?? "").trim(),
    companyAddress: String(company.address ?? "").trim(),
    page2Title: "",
    description: String(doc.description ?? "").trim(),
    tableHeaderDetail: base.tableHeaderDetail,
    tableHeaderCost: base.tableHeaderCost,
    items: rows,
    paymentMilestone: String(item.quotationInfo?.terms ?? "").trim(),
    page3Title: base.page3Title,
    contactName: String(client.name ?? "").trim(),
    contactPhone: String(client.phone ?? "").trim(),
    contactEmail: String(client.email ?? "").trim(),
    logo: typeof company.logoUrl === "string" && company.logoUrl ? company.logoUrl : base.logo,
    bgColor: base.bgColor,
    accentColor: base.accentColor,
  });
}
