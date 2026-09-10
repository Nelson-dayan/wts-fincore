import type { CSSProperties, ReactNode } from "react";
import { QUOTATION_PDF_COLORS } from "@/lib/quotation/quotation-pdf-colors";
import {
  getQuotationLandscapeLogoCornerInsetPx,
  getQuotationLogoMaxPx,
  getQuotationPagePx,
} from "@/lib/quotation/page-layout";
import type { QuotationData } from "@/types/quotation-generator";

/** Ribbon geometry was authored for portrait 794×1123; scaled to current page size. */
const LEGACY_PORTRAIT = { w: 794, h: 1123 } as const;

function r(n: number) {
  return Math.round(n * 100) / 100;
}

/** Darken / lighten hex for ribbon gradients (clamped, PDF-safe). */
function ribbonDarken(hex: string, factor: number): string {
  const v = hex.trim();
  const m = /^#?([0-9a-fA-F]{6})$/.exec(v);
  if (!m) return v;
  const n = parseInt(m[1], 16);
  const red = Math.min(255, Math.round(((n >> 16) & 255) * factor));
  const green = Math.min(255, Math.round(((n >> 8) & 255) * factor));
  const blue = Math.min(255, Math.round((n & 255) * factor));
  return `#${[red, green, blue]
    .map((c) => c.toString(16).padStart(2, "0"))
       .join("")}`;
}

function ribbonLighten(hex: string, t: number): string {
  const v = hex.trim();
  const m = /^#?([0-9a-fA-F]{6})$/.exec(v);
  if (!m) return v;
  const n = parseInt(m[1], 16);
  const lift = (c: number) => Math.min(255, Math.round(c + (255 - c) * t));
  const red = lift((n >> 16) & 255);
  const green = lift((n >> 8) & 255);
  const blue = lift(n & 255);
  return `#${[red, green, blue]
    .map((c) => c.toString(16).padStart(2, "0"))
    .join("")}`;
}

/** Ribbon greys (outer band) — base stops; knee darkens via extra gradient stops. */
const RIBBON_GRAY_EDGE = "#636771";
const RIBBON_GRAY_A = "#4f5159";
const RIBBON_GRAY_KNEE = "#2e3036";
const RIBBON_GRAY_B = "#25262b";
const RIBBON_GRAY_FOLD = "#18191c";

type QuotationPageFrameProps = {
  data: QuotationData;
  page: number;
  children: ReactNode;
};

export function QuotationPageFrame({ data, page, children }: QuotationPageFrameProps) {
  const {
    bgColor,
    accentColor,
    logo,
    logoAlign = "right",
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
  const isLandscape = data.pageOrientation === "landscape";
  const portraitPx = getQuotationPagePx({
    pageFormat: data.pageFormat,
    pageOrientation: "portrait",
  });
  const { maxLogoH, maxLogoW } = getQuotationLogoMaxPx(data);

  const landscapeInset = isLandscape
    ? getQuotationLandscapeLogoCornerInsetPx(portraitPx)
    : null;
  const logoTopPx = landscapeInset
    ? landscapeInset.top
    : Math.round(20 * my);
  const logoSideInsetPx = landscapeInset
    ? landscapeInset.right
    : Math.round(24 * mx);
  const basePadTop = Math.round(36 * my);
  const basePadRight = Math.round(36 * mx);
  const basePadBottom = Math.round(36 * my);
  const basePadLeftRibbon = Math.round(252 * mx);

  /** Clear the top band so the first lines of text do not sit under the logo. */
  const logoBandGap = isLandscape
    ? Math.round(portraitPx.height * 0.012)
    : Math.round(12 * my);
  const padTop = logo
    ? Math.max(basePadTop, logoTopPx + maxLogoH + logoBandGap)
    : basePadTop;

  /**
   * Portrait: light reserve so body is not flush under corner logos. Landscape: reserve the side the logo sits on.
   */
  const landscapeSideExtra = isLandscape
    ? Math.round(portraitPx.width * 0.02)
    : Math.round(16 * mx);

  let padRight = basePadRight;
  let padLeft = basePadLeftRibbon;

  if (logo && logoAlign === "right") {
    padRight = isLandscape
      ? Math.max(
          basePadRight,
          Math.min(
            logoSideInsetPx + maxLogoW + landscapeSideExtra,
            Math.round(W * 0.34)
          )
        )
      : Math.max(basePadRight, logoSideInsetPx + Math.round(maxLogoW * 0.28));
  } else if (logo && logoAlign === "left") {
    padLeft = Math.max(
      basePadLeftRibbon,
      isLandscape
        ? Math.min(
            logoSideInsetPx + maxLogoW + landscapeSideExtra,
            Math.round(W * 0.42)
          )
        : logoSideInsetPx + maxLogoW + Math.round(16 * mx)
    );
  }

  /**
   * Chevron ribbon (legacy 794×1123): sharp bend ~mid height; grey outer + accent inner + thin gleam.
   * Matches reference: parallel angled bands, 3D fold at knee.
   */
  const pathGrayOuter = `M 0 0 L ${r(94 * mx)} 0 L ${r(171 * mx)} ${r(768 * my)} L ${r(210 * mx)} ${r(996 * my)} L ${r(96 * mx)} ${H} L 0 ${H} Z`;
  const pathBlueBand = `M ${r(94 * mx)} 0 L ${r(171 * mx)} ${r(768 * my)} L ${r(210 * mx)} ${r(996 * my)} L ${r(96 * mx)} ${H} L ${r(108 * mx)} ${H} L ${r(223 * mx)} ${r(996 * my)} L ${r(184 * mx)} ${r(768 * my)} L ${r(109 * mx)} 0 Z`;
  const pathHighlight = `M ${r(109 * mx)} 0 L ${r(184 * mx)} ${r(768 * my)} L ${r(223 * mx)} ${r(996 * my)} L ${r(108 * mx)} ${H} L ${r(112 * mx)} ${H} L ${r(227 * mx)} ${r(996 * my)} L ${r(188 * mx)} ${r(768 * my)} L ${r(113 * mx)} 0 Z`;
  /** Wedge at bend — darker fold on grey (inside corner). */
  const pathGrayFold = `M ${r(160 * mx)} ${r(738 * my)} L ${r(171 * mx)} ${r(768 * my)} L ${r(182 * mx)} ${r(782 * my)} L ${r(172 * mx)} ${r(770 * my)} Z`;
  /** Wedge — darker blue inside fold. */
  const pathBlueFold = `M ${r(171 * mx)} ${r(768 * my)} L ${r(184 * mx)} ${r(768 * my)} L ${r(216 * mx)} ${r(984 * my)} L ${r(196 * mx)} ${r(968 * my)} Z`;
  /** Grey / blue shared seam (crisp crease). */
  const pathBandSeam = `M ${r(94 * mx)} 0 L ${r(171 * mx)} ${r(768 * my)} L ${r(210 * mx)} ${r(996 * my)} L ${r(96 * mx)} ${H}`;
  /** Paper edge micro-bevel. */
  const sEdge = Math.max(0.75, r(0.95 * mx));

  const accentLt = ribbonLighten(cyan, 0.2);
  const accentMid = cyan;
  const accentKnee = ribbonDarken(cyan, 0.72);
  const accentDk = ribbonDarken(cyan, 0.58);

  const gradientId = `quot-ribbon-${page}-${W}-${H}`;
  const grayGradId = `${gradientId}-gray`;
  const blueGradId = `${gradientId}-blue`;
  const gleamGradId = `${gradientId}-gleam`;

  const logoPosStyle: CSSProperties =
    logoAlign === "left"
      ? {
          top: `${logoTopPx}px`,
          left: `${logoSideInsetPx}px`,
          right: "auto",
          maxWidth: `${maxLogoW}px`,
          maxHeight: `${maxLogoH}px`,
        }
      : logoAlign === "center"
        ? {
            top: `${logoTopPx}px`,
            left: "50%",
            right: "auto",
            transform: "translateX(-50%)",
            maxWidth: `${maxLogoW}px`,
            maxHeight: `${maxLogoH}px`,
          }
        : {
            top: `${logoTopPx}px`,
            right: `${logoSideInsetPx}px`,
            left: "auto",
            maxWidth: `${maxLogoW}px`,
            maxHeight: `${maxLogoH}px`,
          };

  const logoFlexJustify =
    logoAlign === "left"
      ? "justify-start"
      : logoAlign === "center"
        ? "justify-center"
        : "justify-end";

  const logoObjectClass =
    logoAlign === "left"
      ? "object-top-left"
      : logoAlign === "center"
        ? "object-top"
        : "object-top-right";

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
          className="pointer-events-none absolute left-0 top-0 z-0 h-full w-full text-[0]"
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          shapeRendering="geometricPrecision"
          aria-hidden
        >
          <defs>
            <linearGradient
              id={grayGradId}
              gradientUnits="userSpaceOnUse"
              x1={0}
              y1={0}
              x2={r(210 * mx)}
              y2={H}
            >
              <stop offset="0%" stopColor={RIBBON_GRAY_EDGE} />
              <stop offset="7%" stopColor={RIBBON_GRAY_A} />
              <stop offset="48%" stopColor={RIBBON_GRAY_A} />
              <stop offset="54%" stopColor={RIBBON_GRAY_KNEE} />
              <stop offset="100%" stopColor={RIBBON_GRAY_B} />
            </linearGradient>
            <linearGradient
              id={blueGradId}
              gradientUnits="userSpaceOnUse"
              x1={r(82 * mx)}
              y1={0}
              x2={r(248 * mx)}
              y2={H * 0.98}
            >
              <stop offset="0%" stopColor={accentLt} />
              <stop offset="34%" stopColor={accentMid} />
              <stop offset="50%" stopColor={accentKnee} />
              <stop offset="100%" stopColor={accentDk} />
            </linearGradient>
            <linearGradient
              id={gleamGradId}
              gradientUnits="userSpaceOnUse"
              x1={r(106 * mx)}
              y1={0}
              x2={r(125 * mx)}
              y2={0}
            >
              <stop offset="0%" stopColor="rgba(255,255,255,0.42)" />
              <stop offset="55%" stopColor="rgba(255,255,255,0.12)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
          </defs>
          <path fill={`url(#${grayGradId})`} d={pathGrayOuter} />
          <path fill={RIBBON_GRAY_FOLD} fillOpacity={0.42} d={pathGrayFold} />
          <path fill={`url(#${blueGradId})`} d={pathBlueBand} />
          <path
            fill={ribbonDarken(cyan, 0.44)}
            fillOpacity={0.68}
            d={pathBlueFold}
          />
          <path
            d={pathBandSeam}
            fill="none"
            stroke="rgba(0,0,0,0.11)"
            strokeWidth={sEdge}
            strokeLinejoin="miter"
          />
          <path
            d={pathBandSeam}
            fill="none"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth={Math.max(0.5, r(0.55 * mx))}
            strokeLinejoin="miter"
          />
          <path fill={`url(#${gleamGradId})`} fillOpacity={0.9} d={pathHighlight} />
          <line
            x1={0}
            y1={0}
            x2={0}
            y2={H}
            stroke="rgba(255,255,255,0.14)"
            strokeWidth={sEdge}
          />
        </svg>
      ) : null}

      {logo ? (
        <div
          className={`pointer-events-none absolute z-10 flex items-start ${logoFlexJustify}`}
          style={logoPosStyle}
        >
          <img
            src={logo}
            alt=""
            className={`h-auto w-auto max-h-full max-w-full object-contain ${logoObjectClass}`}
            style={{ maxHeight: maxLogoH, maxWidth: maxLogoW }}
          />
        </div>
      ) : null}

      <div
        className="relative z-1 box-border flex h-full min-h-0 flex-col text-[14px] leading-relaxed"
        style={{
          padding: `${padTop}px ${padRight}px ${basePadBottom}px ${padLeft}px`,
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
