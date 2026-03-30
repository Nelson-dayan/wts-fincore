export type QuotationItem = {
  detail: string;
  cost: string;
};

export type QuotationData = {
  /** Page 1 — main accent line (e.g. product name). Empty = hidden. */
  page1Title: string;
  clientName: string;
  refNo: string;
  date: string;
  companyName: string;
  companyAddress: string;
  /** Page 2 — heading under logo area. Empty = hidden. */
  page2Title: string;
  description: string;
  /** Table header cells; both empty = no header row. */
  tableHeaderDetail: string;
  tableHeaderCost: string;
  items: QuotationItem[];
  paymentMilestone: string;
  /** Page 3 — section title. Empty = hidden. */
  page3Title: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  logo?: string;
  bgColor: string;
  accentColor: string;
};

export const defaultQuotationData = (): QuotationData => ({
  page1Title: "",
  clientName: "",
  refNo: "",
  date: "",
  companyName: "",
  companyAddress: "",
  page2Title: "",
  description: "",
  tableHeaderDetail: "Details",
  tableHeaderCost: "Total Cost (USD)",
  items: [{ detail: "", cost: "" }],
  paymentMilestone: "",
  page3Title: "Contact Details",
  contactName: "",
  contactPhone: "",
  contactEmail: "",
  logo: undefined,
  bgColor: "#E6E7E8",
  accentColor: "#00AEEF",
});

export const QUOTATION_STORAGE_KEY = "quotation-generator-draft";

function defaultIfBlank(value: unknown, fallback: string): string {
  const s = String(value ?? "").trim();
  return s === "" ? fallback : String(value ?? "");
}

export function normalizeQuotationData(raw: unknown): QuotationData {
  const base = defaultQuotationData();
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  const itemsRaw = o.items;
  const items: QuotationItem[] =
    Array.isArray(itemsRaw) && itemsRaw.length > 0
      ? itemsRaw.map((it) => {
          const row = it && typeof it === "object" ? (it as Record<string, unknown>) : {};
          return {
            detail: String(row.detail ?? ""),
            cost: String(row.cost ?? ""),
          };
        })
      : base.items;

  return {
    ...base,
    page1Title: String(o.page1Title ?? base.page1Title),
    clientName: String(o.clientName ?? base.clientName),
    refNo: String(o.refNo ?? base.refNo),
    date: String(o.date ?? base.date),
    companyName: String(o.companyName ?? base.companyName),
    companyAddress: String(o.companyAddress ?? base.companyAddress),
    page2Title: String(o.page2Title ?? base.page2Title),
    description: String(o.description ?? base.description),
    tableHeaderDetail: defaultIfBlank(o.tableHeaderDetail, base.tableHeaderDetail),
    tableHeaderCost: defaultIfBlank(o.tableHeaderCost, base.tableHeaderCost),
    paymentMilestone: String(o.paymentMilestone ?? base.paymentMilestone),
    page3Title: defaultIfBlank(o.page3Title, base.page3Title),
    contactName: String(o.contactName ?? base.contactName),
    contactPhone: String(o.contactPhone ?? base.contactPhone),
    contactEmail: String(o.contactEmail ?? base.contactEmail),
    logo: typeof o.logo === "string" ? o.logo : base.logo,
    bgColor: String(o.bgColor ?? base.bgColor),
    accentColor: String(o.accentColor ?? base.accentColor),
    items,
  };
}
