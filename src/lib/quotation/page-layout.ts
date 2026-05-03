import type { QuotationData } from "@/types/quotation-generator";

/** Vertical padding on `QuotationPreview` root (`pt-2` + `pb-8` at 16px root). */
export const QUOTATION_PREVIEW_ROOT_VERTICAL_PADDING_PX = 8 + 32;

/** Gap between pages in `QuotationPreview` (`gap-10` ≈ 2.5rem). */
export const QUOTATION_PREVIEW_INTER_PAGE_GAP_PX = 40;

type PagePreset = { w: number; h: number };

const PAGE_PRESETS: Record<QuotationData["pageFormat"], PagePreset> = {
  // 96dpi approximations for editor/preview rendering.
  a4: { w: 794, h: 1123 },
  letter: { w: 816, h: 1056 },
};

export function getQuotationPagePx(data: Pick<QuotationData, "pageFormat" | "pageOrientation">) {
  const preset = PAGE_PRESETS[data.pageFormat] ?? PAGE_PRESETS.a4;
  if (data.pageOrientation === "landscape") {
    return { width: preset.h, height: preset.w };
  }
  return { width: preset.w, height: preset.h };
}

/** Logo box matches portrait for the same paper — landscape mein bhi wahi size dikhe. */
export function getQuotationLogoMaxPx(data: Pick<QuotationData, "pageFormat">) {
  const { width: pw, height: ph } = getQuotationPagePx({
    pageFormat: data.pageFormat,
    pageOrientation: "portrait",
  });
  return {
    maxLogoH: Math.min(Math.round(ph * 0.09), 96),
    maxLogoW: Math.min(Math.round(pw * 0.38), 264),
  };
}

/**
 * Landscape: top/right gap from page edge — portrait sheet ratios so A4 & Letter feel the same
 * (corner se “thoda side”, Letter-landscape jaisa), not raw mx/my (jo A4 pe tight corner banata tha).
 */
export function getQuotationLandscapeLogoCornerInsetPx(portrait: {
  width: number;
  height: number;
}) {
  return {
    top: Math.round(portrait.height * 0.028),
    right: Math.round(portrait.width * 0.046),
  };
}

/** Total height of the multi-page preview stack (matches `QuotationPreview` layout). */
export function getQuotationPreviewStackHeightPx(pageHeightPx: number, totalPages: number) {
  return (
    QUOTATION_PREVIEW_ROOT_VERTICAL_PADDING_PX +
    totalPages * pageHeightPx +
    (totalPages - 1) * QUOTATION_PREVIEW_INTER_PAGE_GAP_PX
  );
}
