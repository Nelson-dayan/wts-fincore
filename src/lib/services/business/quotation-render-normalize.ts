import type { QuotationRenderDraft } from "@/lib/services/business/quotation-render.types";
import { defaultQuotationBranding } from "@/lib/portals/quotation-preview-utils";

function safeNum(n: unknown): number {
  const x = Number(n);
  return Number.isFinite(x) ? x : 0;
}

/** Coerce partial/malformed JSON so PDF/DOCX generation never throws on missing branches. */
export function normalizeQuotationRenderDraft(d: QuotationRenderDraft): QuotationRenderDraft {
  const totalsIn = d.totals ?? { subtotal: 0, tax: 0, total: 0 };
  const di = d.documentInfo;
  const dateRaw = di?.date;
  let dateIso = new Date().toISOString();
  if (dateRaw) {
    const t = Date.parse(String(dateRaw));
    if (!Number.isNaN(t)) dateIso = new Date(t).toISOString();
  }
  const qi = d.quotationInfo ?? {};
  let confirmIso: string | undefined;
  if (qi.confirmDate) {
    const t = Date.parse(String(qi.confirmDate));
    if (!Number.isNaN(t)) confirmIso = new Date(t).toISOString();
  }
  const pagesIn = Array.isArray(d.pages) ? d.pages : [];
  return {
    ...d,
    documentInfo: {
      quotationCode: di?.quotationCode,
      geCode: di?.geCode,
      date: dateIso,
      subject: di?.subject,
      title: di?.title,
      description: di?.description,
      taxRate: safeNum(di?.taxRate),
      taxEnabled: Boolean(di?.taxEnabled),
    },
    clientSnapshot: {
      name: String(d.clientSnapshot?.name ?? "—"),
      company: d.clientSnapshot?.company,
      address: d.clientSnapshot?.address,
      logoText: d.clientSnapshot?.logoText,
      signatureText: d.clientSnapshot?.signatureText,
    },
    companySnapshot: {
      name: String(d.companySnapshot?.name ?? "—"),
      address: d.companySnapshot?.address,
      email: d.companySnapshot?.email,
      website: d.companySnapshot?.website,
      logoUrl: d.companySnapshot?.logoUrl,
      logoText: d.companySnapshot?.logoText,
      signatureText: d.companySnapshot?.signatureText,
    },
    pages: pagesIn.map((p) => ({
      pageNumber: safeNum(p.pageNumber),
      items: Array.isArray(p.items)
        ? p.items.map((item) => ({
            number: safeNum(item.number),
            name: String(item?.name ?? ""),
            quantity: safeNum(item?.quantity),
            price: safeNum(item?.price),
          }))
        : [],
    })),
    totals: {
      subtotal: safeNum(totalsIn.subtotal),
      tax: safeNum(totalsIn.tax),
      total: safeNum(totalsIn.total),
    },
    quotationInfo: {
      leadTime: qi.leadTime,
      terms: qi.terms,
      validity: qi.validity,
      remainingText: qi.remainingText,
      confirmDate: confirmIso,
    },
    branding: {
      ...defaultQuotationBranding(),
      ...d.branding,
    },
  };
}
