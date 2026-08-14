export type QuotationItem = {
  number: number;
  name: string;
  description: string;
  quantity: number;
  price: number;
};

export type QuotationPage = {
  pageNumber: number;
  items: QuotationItem[];
};

export type QuotationData = {
  /** Page 1 — main accent line (e.g. product name). Empty = hidden. */
  page1Title: string;
  clientName: string;
  refNo: string;
  date: string;
  companyName: string;
  companyAddress: string;
  /** True if user unlocked and manually edited company details (disables automatic context sync). */
  isCompanyDataEdited?: boolean;
  /** True if user unlocked and manually edited the quotation number / reference number. */
  isRefNoEdited?: boolean;
  /** Page 2 — heading under logo area. Empty = hidden. */
  page2Title: string;
  description: string;
  tableHeaderDetail: string;
  tableHeaderCost: string;
  pages: QuotationPage[];
  currency: string;
  taxRate: number;
  discount: number;
  paymentMilestone: string;
  /** Page 3 — section title. Empty = hidden. */
  page3Title: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  logo?: string;
  backgroundImage?: string;
  bgColor: string;
  accentColor: string;
  useDecorShapes: boolean;
  useGradientBackground: boolean;
  tableUseAccentPreset: boolean;
  tableHeaderBg: string;
  tableBodyBg: string;
  tableBorderColor: string;
  coverTextAlign: "left" | "center" | "right";
  page2TextAlign: "left" | "center" | "right";
  contactTextAlign: "left" | "center" | "right";
  /** Logo corner / top band: left, center, or right on each PDF page. */
  logoAlign: "left" | "center" | "right";
  /** Page 2 — cost table block horizontal position (max-w-4xl). */
  tableBlockAlign: "left" | "center" | "right";
  pageFormat: "a4" | "letter";
  pageOrientation: "portrait" | "landscape";
};

export const defaultQuotationData = (): QuotationData => ({
  page1Title: "",
  clientName: "",
  refNo: "",
  date: "",
  companyName: "",
  companyAddress: "",
  isCompanyDataEdited: false,
  isRefNoEdited: false,
  page2Title: "",
  description: "",
  tableHeaderDetail: "Details",
  tableHeaderCost: "Total",
  pages: [{
    pageNumber: 1,
    items: [{ number: 1, name: "", description: "", quantity: 1, price: 0 }],
  }],
  currency: "AED",
  taxRate: 0,
  discount: 0,
  paymentMilestone: "",
  page3Title: "Contact Details",
  contactName: "",
  contactPhone: "",
  contactEmail: "",
  logo: undefined,
  backgroundImage: undefined,
  bgColor: "#E6E7E8",
  accentColor: "#00AEEF",
  useDecorShapes: false,
  useGradientBackground: false,
  tableUseAccentPreset: true,
  tableHeaderBg: "#E6F2FF",
  tableBodyBg: "#f4f9fd",
  tableBorderColor: "#cfe8fc",
  coverTextAlign: "center",
  page2TextAlign: "center",
  contactTextAlign: "left",
  logoAlign: "right",
  tableBlockAlign: "center",
  pageFormat: "a4",
  pageOrientation: "landscape",
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
  let pages: QuotationPage[] = base.pages;
  const pagesRaw = o.pages;
  if (Array.isArray(pagesRaw) && pagesRaw.length > 0) {
    pages = pagesRaw.map((p: any, i: number) => ({
      pageNumber: Number(p?.pageNumber) || i + 1,
      items: Array.isArray(p?.items)
        ? p.items.map((it: any, j: number) => ({
            number: Number(it?.number) || j + 1,
            name: String(it?.name ?? it?.detail ?? ""),
            description: String(it?.description ?? ""),
            quantity: Number(it?.quantity) || 1,
            price: Number(it?.price ?? String(it?.cost ?? "").replace(/[^0-9.]/g, "")) || 0,
          }))
        : [],
    }));
  } else if (Array.isArray(o.items) && o.items.length > 0) {
    pages = [{
      pageNumber: 1,
      items: o.items.map((it: any, j: number) => ({
        number: Number(it?.number) || j + 1,
        name: String(it?.name ?? it?.detail ?? ""),
        description: String(it?.description ?? ""),
        quantity: Number(it?.quantity) || 1,
        price: Number(it?.price ?? String(it?.cost ?? "").replace(/[^0-9.]/g, "")) || 0,
      })),
    }];
  }

  return {
    ...base,
    page1Title: String(o.page1Title ?? base.page1Title),
    clientName: String(o.clientName ?? base.clientName),
    refNo: String(o.refNo ?? base.refNo),
    date: String(o.date ?? base.date),
    companyName: String(o.companyName ?? base.companyName),
    companyAddress: String(o.companyAddress ?? base.companyAddress),
    isCompanyDataEdited: typeof o.isCompanyDataEdited === "boolean" ? o.isCompanyDataEdited : false,
    isRefNoEdited: typeof o.isRefNoEdited === "boolean" ? o.isRefNoEdited : false,
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
    backgroundImage: typeof o.backgroundImage === "string" ? o.backgroundImage : base.backgroundImage,
    bgColor: String(o.bgColor ?? base.bgColor),
    accentColor: String(o.accentColor ?? base.accentColor),
    useDecorShapes:
      typeof o.useDecorShapes === "boolean" ? o.useDecorShapes : base.useDecorShapes,
    useGradientBackground:
      typeof o.useGradientBackground === "boolean"
        ? o.useGradientBackground
        : base.useGradientBackground,
    tableUseAccentPreset:
      typeof o.tableUseAccentPreset === "boolean"
        ? o.tableUseAccentPreset
        : base.tableUseAccentPreset,
    tableHeaderBg: defaultIfBlank(o.tableHeaderBg, base.tableHeaderBg),
    tableBodyBg: defaultIfBlank(o.tableBodyBg, base.tableBodyBg),
    tableBorderColor: defaultIfBlank(o.tableBorderColor, base.tableBorderColor),
    coverTextAlign:
      o.coverTextAlign === "left" || o.coverTextAlign === "right" || o.coverTextAlign === "center"
        ? o.coverTextAlign
        : base.coverTextAlign,
    page2TextAlign:
      o.page2TextAlign === "left" || o.page2TextAlign === "right" || o.page2TextAlign === "center"
        ? o.page2TextAlign
        : base.page2TextAlign,
    contactTextAlign:
      o.contactTextAlign === "left" ||
      o.contactTextAlign === "right" ||
      o.contactTextAlign === "center"
        ? o.contactTextAlign
        : base.contactTextAlign,
    logoAlign:
      o.logoAlign === "left" || o.logoAlign === "right" || o.logoAlign === "center"
        ? o.logoAlign
        : base.logoAlign,
    tableBlockAlign:
      o.tableBlockAlign === "left" ||
      o.tableBlockAlign === "right" ||
      o.tableBlockAlign === "center"
        ? o.tableBlockAlign
        : base.tableBlockAlign,
    pageFormat: o.pageFormat === "letter" ? "letter" : base.pageFormat,
    pageOrientation:
      o.pageOrientation === "portrait" || o.pageOrientation === "landscape"
        ? o.pageOrientation
        : base.pageOrientation,
    currency: String(o.currency ?? base.currency),
    taxRate: Number(o.taxRate) || base.taxRate,
    discount: Number(o.discount) || base.discount,
    pages,
  };
}
