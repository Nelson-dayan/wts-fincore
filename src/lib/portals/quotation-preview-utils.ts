export type QuotationBrandingState = {
  useCompanyLogo: boolean;
  useCompanySignature: boolean;
  showClientSignature: boolean;
  customLogoText: string;
  customSignatureText: string;
};

export function defaultQuotationBranding(): QuotationBrandingState {
  return {
    useCompanyLogo: true,
    useCompanySignature: true,
    showClientSignature: false,
    customLogoText: "",
    customSignatureText: "",
  };
}

export function resolveQuotationLogoSrc(
  branding: QuotationBrandingState,
  companySnapshot: { logoText?: string; logoUrl?: string }
): string | null {
  if (branding.useCompanyLogo) {
    const fromCompany = String(companySnapshot.logoText ?? companySnapshot.logoUrl ?? "").trim();
    return fromCompany || null;
  }
  const custom = String(branding.customLogoText ?? "").trim();
  return custom || null;
}

export function resolveCompanySignatureSrc(
  branding: QuotationBrandingState,
  companySnapshot: { signatureText?: string }
): string | null {
  if (branding.useCompanySignature) {
    const c = String(companySnapshot.signatureText ?? "").trim();
    return c || null;
  }
  return String(branding.customSignatureText ?? "").trim() || null;
}

export function resolveClientSignatureSrc(
  branding: QuotationBrandingState,
  clientSnapshot: { signatureText?: string }
): string | null {
  if (!branding.showClientSignature) return null;
  const c = String(clientSnapshot.signatureText ?? "").trim();
  return c || null;
}

type LineLike = { quantity: number; price: number };

export function computePreviewTotals(
  pages: Array<{ items: LineLike[] }>,
  taxRate: number,
  taxEnabled: boolean
): { subtotal: number; tax: number; total: number } {
  let subtotal = 0;
  for (const page of pages) {
    for (const item of page.items ?? []) {
      subtotal += Number(item.quantity ?? 0) * Number(item.price ?? 0);
    }
  }
  const rate = Math.max(0, taxRate);
  const tax = taxEnabled ? (subtotal * rate) / 100 : 0;
  return { subtotal, tax, total: subtotal + tax };
}
