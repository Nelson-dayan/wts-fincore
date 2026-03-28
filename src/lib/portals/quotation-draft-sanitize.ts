import type { QuotationRenderDraft } from "@/lib/services/business/quotation-render.types";

/** Keep JSON payloads under typical limits; huge data URLs break `req.json()` / route handlers. */
const MAX_DATA_URL_CHARS = 450_000;

function truncateDataUrl(s: string | undefined): string | undefined {
  if (!s) return undefined;
  if (!s.startsWith("data:image/")) return s;
  if (s.length <= MAX_DATA_URL_CHARS) return s;
  return undefined;
}

/** Use for /api/admin/quotations/render only — full snapshots stay in form state for save. */
export function sanitizeDraftForServerRender(draft: QuotationRenderDraft): QuotationRenderDraft {
  return {
    ...draft,
    clientSnapshot: {
      ...draft.clientSnapshot,
      logoText: truncateDataUrl(draft.clientSnapshot.logoText),
      signatureText: truncateDataUrl(draft.clientSnapshot.signatureText),
    },
    companySnapshot: {
      ...draft.companySnapshot,
      logoText: truncateDataUrl(draft.companySnapshot.logoText),
      signatureText: truncateDataUrl(draft.companySnapshot.signatureText),
    },
    branding: {
      ...draft.branding,
      customLogoText: truncateDataUrl(draft.branding.customLogoText),
      customSignatureText: truncateDataUrl(draft.branding.customSignatureText),
    },
  };
}
