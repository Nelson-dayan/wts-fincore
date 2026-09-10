export type LineItem = {
  number: number;
  name: string;
  displayName: string;
  description: string;
  quantity: number;
  price: number;
  length: string;
  width: string;
};

export type PageBlock = {
  pageNumber: number;
  items: LineItem[];
};

export type QuotationPayload = {
  _id: string;
  quotationNumber: string;
  projectId: string;
  projectName?: string;
  status: "draft" | "sent" | "approved" | "rejected";
  currency: string;
  documentInfo: {
    quotationCode?: string;
    geCode?: string;
    date: string;
    subject: string;
    title: string;
    description: string;
    taxRate: number;
    taxEnabled: boolean;
  };
  clientSnapshot: {
    name: string;
    company: string;
    address: string;
    logoText?: string;
    signatureText?: string;
  };
  companySnapshot: {
    name: string;
    address: string;
    email: string;
    website: string;
    logoUrl: string;
    logoText?: string;
    signatureText?: string;
  };
  branding?: {
    useCompanyLogo?: boolean;
    useCompanySignature?: boolean;
    showClientSignature?: boolean;
    customLogoText?: string;
    customSignatureText?: string;
  };
  internalNotes?: string;
  pages: Array<{
    pageNumber: number;
    items: Array<{
      number: number;
      name: string;
      displayName?: string;
      description?: string;
      length?: number;
      width?: number;
      quantity: number;
      price: number;
    }>;
  }>;
  totals: { subtotal: number; tax: number; total: number };
  quotationInfo: {
    leadTime?: string;
    confirmDate?: string;
    terms?: string;
    validity?: string;
    remainingAmount?: number;
    remainingText?: string;
  };
  message?: string;
};

export function emptyLine(n: number): LineItem {
  return {
    number: n,
    name: "",
    displayName: "",
    description: "",
    quantity: 1,
    price: 0,
    length: "",
    width: "",
  };
}

export function mapPagesFromApi(pages: QuotationPayload["pages"]): PageBlock[] {
  return pages.map((p) => ({
    pageNumber: p.pageNumber,
    items: p.items.map((item) => ({
      number: item.number,
      name: item.name,
      displayName: item.displayName ?? "",
      description: item.description ?? "",
      quantity: item.quantity,
      price: typeof item.price === "number" ? item.price : Number(item.price),
      length: item.length !== undefined ? String(item.length) : "",
      width: item.width !== undefined ? String(item.width) : "",
    })),
  }));
}
