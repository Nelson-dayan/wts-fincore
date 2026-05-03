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
  const doc = item.documentInfo ?? {};
  const client = item.clientSnapshot ?? {};
  const company = item.companySnapshot ?? {};

  let data = defaultQuotationData();
  if (item.pdfBuilderData && typeof item.pdfBuilderData === "object") {
    data = normalizeQuotationData(item.pdfBuilderData);
  }

  // Ensure DB fields always take precedence over stale pdfBuilderData
  const pagesRaw = item.pages || [];
  if (pagesRaw.length > 0) {
    data.pages = pagesRaw.map((p, i) => ({
      pageNumber: p.pageNumber || i + 1,
      items: (p.items || []).map((it, j) => ({
        number: it.number || j + 1,
        name: String(it.name ?? it.description ?? "").trim(),
        description: String(it.description ?? "").trim(),
        quantity: Number(it.quantity) || 1,
        price: Number(it.price) || 0,
      })),
    }));
  }

  const rawDate = doc.date ? new Date(String(doc.date)) : null;
  const dateStr =
    rawDate && !Number.isNaN(rawDate.getTime())
      ? rawDate.toISOString().slice(0, 10)
      : "";

  return normalizeQuotationData({
    ...data,
    page1Title: String(doc.subject ?? data.page1Title).trim(),
    clientName: String(client.company ?? client.name ?? data.clientName).trim(),
    refNo: String(doc.quotationCode ?? doc.geCode ?? data.refNo).trim(),
    date: dateStr || data.date,
    companyName: String(company.name ?? data.companyName).trim(),
    companyAddress: String(company.address ?? data.companyAddress).trim(),
    currency: String((item as any).currency ?? data.currency),
    taxRate: Number(doc.taxRate) ?? data.taxRate,
    discount: Number((item as any).discount) ?? data.discount,
    paymentMilestone: String(item.quotationInfo?.terms ?? data.paymentMilestone).trim(),
    contactName: String(client.name ?? data.contactName).trim(),
    contactPhone: String(client.phone ?? data.contactPhone).trim(),
    contactEmail: String(client.email ?? data.contactEmail).trim(),
  });
}

