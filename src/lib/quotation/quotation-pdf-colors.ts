/**
 * sRGB-only palette for quotation pages (html2canvas cannot parse lab/oklch/lch).
 * Hex values align with Tailwind v3 "slate" scale for the same on-screen look.
 */
export const QUOTATION_PDF_COLORS = {
  slate900: "#0f172a",
  slate800: "#1e293b",
  slate700: "#334155",
  /** Default body copy — matches former `text-[#2b2b2c]` on frame content */
  body: "#2b2b2c",
  borderHairline: "rgba(0,0,0,0.05)",
  shadowCard: "0 10px 36px rgba(0,0,0,0.1)",
  /** Replaces Tailwind `shadow-sm` without modern color spaces */
  shadowSm: "0 1px 2px 0 rgba(0,0,0,0.05)",
} as const;
