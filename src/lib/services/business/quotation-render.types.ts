/** Draft payload for PDF/DOCX render (create form or saved quotation). */
export type QuotationRenderDraft = {
  quotationNumberLabel?: string;
  status?: string;
  documentInfo: {
    quotationCode?: string;
    /** @deprecated legacy */
    geCode?: string;
    date: string;
    subject?: string;
    title?: string;
    description?: string;
    taxRate?: number;
    taxEnabled?: boolean;
  };
  clientSnapshot: {
    name: string;
    company?: string;
    address?: string;
    logoText?: string;
    signatureText?: string;
  };
  companySnapshot: {
    name: string;
    address?: string;
    email?: string;
    website?: string;
    logoUrl?: string;
    logoText?: string;
    signatureText?: string;
  };
  pages: Array<{
    pageNumber: number;
    items: Array<{
      number: number;
      name: string;
      quantity: number;
      price: number;
    }>;
  }>;
  totals: { subtotal: number; tax: number; total: number };
  quotationInfo: {
    leadTime?: string;
    terms?: string;
    validity?: string;
    remainingText?: string;
    confirmDate?: string;
  };
  branding: {
    useCompanyLogo?: boolean;
    useCompanySignature?: boolean;
    showClientSignature?: boolean;
    customLogoText?: string;
    customSignatureText?: string;
  };
};

export function quotationCodeFromDocumentInfo(
  di: QuotationRenderDraft["documentInfo"]
): string {
  return String(di.quotationCode ?? di.geCode ?? "").trim();
}
