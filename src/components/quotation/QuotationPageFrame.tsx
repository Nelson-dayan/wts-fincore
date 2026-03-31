import type { ReactNode } from "react";
import { QUOTATION_PDF_COLORS } from "@/lib/quotation/quotation-pdf-colors";
import { getQuotationPagePx } from "@/lib/quotation/page-layout";
import type { QuotationData } from "@/types/quotation-generator";

/** Ribbon geometry was authored for portrait 794×1123; scaled to current page size. */
const LEGACY_PORTRAIT = { w: 794, h: 1123 } as const;

function r(n: number) {
  return Math.round(n * 100) / 100;
}

/** Left ribbon artwork — charcoal + cyan + hairline. */
const CHARCOAL = "#414042";
const THIN_CYAN = "#33d6ff";

type QuotationPageFrameProps = {
  data: QuotationData;
  page: 1 | 2 | 3;
  children: ReactNode;
};

export function QuotationPageFrame({ data, page, children }: QuotationPageFrameProps) {
  const {
    bgColor,
    accentColor,
    logo,
    backgroundImage,
    useDecorShapes,
    useGradientBackground,
  } = data;
  const cyan = accentColor;

  const pagePx = getQuotationPagePx(data);
  const W = pagePx.width;
  const H = pagePx.height;
  const mx = W / LEGACY_PORTRAIT.w;
  const my = H / LEGACY_PORTRAIT.h;

  const pathCharcoal = `M 0 0 L ${r(94 * mx)} 0 L ${r(171 * mx)} ${r(768 * my)} L ${r(210 * mx)} ${r(996 * my)} L ${r(96 * mx)} ${H} L 0 ${r(1092 * my)} Z`;

  const pathCyan = `M ${r(94 * mx)} 0 L ${r(171 * mx)} ${r(768 * my)} L ${r(210 * mx)} ${r(996 * my)} L ${r(96 * mx)} ${H} L ${r(108 * mx)} ${H} L ${r(223 * mx)} ${r(996 * my)} L ${r(184 * mx)} ${r(768 * my)} L ${r(109 * mx)} 0 Z`;

  const pathThin = `M ${r(109 * mx)} 0 L ${r(184 * mx)} ${r(768 * my)} L ${r(223 * mx)} ${r(996 * my)} L ${r(108 * mx)} ${H} L ${r(112 * mx)} ${H} L ${r(227 * mx)} ${r(996 * my)} L ${r(188 * mx)} ${r(768 * my)} L ${r(113 * mx)} 0 Z`;

  const padLeft = Math.round(252 * mx);

  return (
    <div
      data-quotation-page={page}
      className="relative box-border shrink-0 overflow-hidden rounded-sm"
      style={{
        width: `${W}px`,
        height: `${H}px`,
        minWidth: `${W}px`,
        minHeight: `${H}px`,
        maxWidth: `${W}px`,
        maxHeight: `${H}px`,
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: QUOTATION_PDF_COLORS.borderHairline,
        boxShadow: QUOTATION_PDF_COLORS.shadowCard,
        background: backgroundImage
          ? `linear-gradient(rgba(255,255,255,0.66), rgba(255,255,255,0.66)), url("${backgroundImage}") center/cover no-repeat`
          : useGradientBackground
            ? `radial-gradient(ellipse 118% 120% at 78% 40%, #ffffff 0%, #f7f7f8 45%, ${bgColor} 100%)`
            : bgColor,
      }}
    >
      {useDecorShapes ? (
        <svg
          className="pointer-events-none absolute left-0 top-0 h-full w-full text-[0]"
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          aria-hidden
        >
          <path fill={CHARCOAL} d={pathCharcoal} />
          <path fill={cyan} d={pathCyan} />
          <path fill={THIN_CYAN} d={pathThin} />
        </svg>
      ) : null}

      {logo ? (
        <div
          className="absolute right-6 top-5 z-1 flex h-18 w-56 items-center justify-center overflow-hidden rounded-lg bg-white/80 p-2"
          style={{ boxShadow: QUOTATION_PDF_COLORS.shadowLogo }}
        >
          <img src={logo} alt="" className="h-full w-full object-contain" />
        </div>
      ) : null}

      <div
        className="relative z-1 box-border flex h-full min-h-0 flex-col text-[14px] leading-relaxed"
        style={{
          padding: `${Math.round(36 * my)}px ${Math.round(36 * mx)}px ${Math.round(36 * my)}px ${padLeft}px`,
          color: QUOTATION_PDF_COLORS.body,
          fontFamily:
            'system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        }}
      >
        {children}
      </div>
    </div>
  );
}
