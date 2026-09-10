import { isImageSrc } from "@/lib/utils/is-image-src";

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
    showClientSignature: true,
    customLogoText: "",
    customSignatureText: "",
  };
}

export function resolveQuotationLogoSrc(
  branding: QuotationBrandingState,
  companySnapshot: { logoText?: string; logoUrl?: string }
): string | null {
  if (branding.useCompanyLogo) {
    const candidates = [companySnapshot.logoUrl, companySnapshot.logoText];
    for (const cand of candidates) {
      if (isImageSrc(cand)) return cand!.trim();
    }
    return null;
  }
  const custom = String(branding.customLogoText ?? "").trim();
  return isImageSrc(custom) ? custom : null;
}

export function resolveCompanySignatureSrc(
  branding: QuotationBrandingState,
  companySnapshot: { signatureText?: string }
): string | null {
  if (branding.useCompanySignature) {
    const c = String(companySnapshot.signatureText ?? "").trim();
    return isImageSrc(c) ? c : null;
  }
  const custom = String(branding.customSignatureText ?? "").trim();
  return isImageSrc(custom) ? custom : null;
}

export function resolveClientSignatureSrc(
  branding: QuotationBrandingState,
  clientSnapshot: { signatureText?: string }
): string | null {
  const c = String(clientSnapshot.signatureText ?? "").trim();
  if (!isImageSrc(c)) return null;
  /* Explicit false hides; true/undefined (legacy drafts) shows when a signature image exists. */
  if (branding.showClientSignature === false) return null;
  return c;
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
