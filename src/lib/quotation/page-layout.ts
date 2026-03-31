import type { QuotationData } from "@/types/quotation-generator";

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
