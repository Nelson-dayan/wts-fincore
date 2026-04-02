import { QUOTATION_PDF_COLORS } from "@/lib/quotation/quotation-pdf-colors";
import { cn } from "@/lib/utils/cn";
import type { QuotationData } from "@/types/quotation-generator";
import { QuotationPageFrame } from "./QuotationPageFrame";

function withAlpha(hex: string, alpha: number) {
  const v = hex.trim();
  if (!/^#([0-9a-fA-F]{6})$/.test(v)) return v;
  const n = v.slice(1);
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

type Page2Props = {
  data: QuotationData;
};

export function Page2({ data }: Page2Props) {
  const {
    page1Title,
    page2Title,
    description,
    items,
    paymentMilestone,
    tableHeaderDetail,
    tableHeaderCost,
    accentColor,
    tableUseAccentPreset,
    tableHeaderBg,
    tableBodyBg,
    tableBorderColor,
    page2TextAlign,
    tableBlockAlign = "center",
    pageOrientation,
  } = data;
  const isLandscape = pageOrientation === "landscape";
  const rows = items.length > 0 ? items : [{ detail: "", cost: "" }];
  const hDetail = tableHeaderDetail.trim();
  const hCost = tableHeaderCost.trim();
  const showThead = Boolean(hDetail || hCost);

  const customTitle = page2Title.trim();
  const p1 = page1Title.trim();
  const showComposedTitle = !customTitle && Boolean(p1);

  const milestoneLines = paymentMilestone
    .trim()
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const headerBg = tableUseAccentPreset ? withAlpha(accentColor, 0.16) : tableHeaderBg;
  const bodyBg = tableUseAccentPreset ? withAlpha(accentColor, 0.06) : tableBodyBg;
  const borderColor = tableUseAccentPreset ? withAlpha(accentColor, 0.32) : tableBorderColor;
  const headingAlignClass =
    page2TextAlign === "left"
      ? "text-left"
      : page2TextAlign === "right"
        ? "text-right"
        : "text-center";

  const milestoneRowClass =
    page2TextAlign === "right"
      ? "flex gap-2 justify-end"
      : page2TextAlign === "center"
        ? "flex gap-2 justify-center"
        : "flex gap-2";

  /** Landscape pages are wide — narrower table block (~36rem); portrait keeps max-w-4xl. */
  const page2BlockMaxClass = isLandscape ? "max-w-xl" : "max-w-4xl";

  return (
    <QuotationPageFrame data={data} page={2}>
      <div className="flex h-full min-h-0 flex-col justify-center gap-5 pt-1">
        {customTitle ? (
          <h2
            className={`shrink-0 text-[17px] font-normal leading-snug md:text-[19px] ${headingAlignClass}`}
            style={{ color: QUOTATION_PDF_COLORS.slate900 }}
          >
            {customTitle}
          </h2>
        ) : showComposedTitle ? (
          <h2
            className={`shrink-0 text-[17px] font-normal leading-snug md:text-[19px] ${headingAlignClass}`}
            style={{ color: QUOTATION_PDF_COLORS.slate900 }}
          >
            {p1}
            <span style={{ color: QUOTATION_PDF_COLORS.slate900 }}>- </span>
            <strong className="font-bold">QUOTATION</strong>
          </h2>
        ) : null}

        {description.trim() ? (
          <p
            className={`shrink-0 px-2 text-[14px] leading-relaxed md:text-[15px] ${headingAlignClass}`}
            style={{ color: QUOTATION_PDF_COLORS.slate800 }}
          >
            {description.trim()}
          </p>
        ) : null}

        <section
          className={cn(
            "w-full shrink-0",
            page2BlockMaxClass,
            tableBlockAlign === "left" && "mr-auto",
            tableBlockAlign === "center" && "mx-auto",
            tableBlockAlign === "right" && "ml-auto"
          )}
        >
          <div
            className="overflow-hidden rounded-lg border"
            style={{
              borderColor,
              backgroundColor: bodyBg,
              boxShadow: QUOTATION_PDF_COLORS.shadowSm,
            }}
          >
            <table className="w-full table-fixed border-collapse text-[13px] md:text-[14px]">
              <colgroup>
                <col style={{ width: "72%" }} />
                <col style={{ width: "28%" }} />
              </colgroup>
              {showThead ? (
                <thead>
                  <tr style={{ backgroundColor: headerBg }}>
                    <th
                      className="border px-3 py-2.5 text-left font-bold wrap-break-word"
                      style={{ borderColor, color: QUOTATION_PDF_COLORS.slate900 }}
                    >
                      {hDetail}
                    </th>
                    <th
                      className="border px-3 py-2.5 text-right font-bold whitespace-nowrap"
                      style={{ borderColor, color: QUOTATION_PDF_COLORS.slate900 }}
                    >
                      {hCost}
                    </th>
                  </tr>
                </thead>
              ) : null}
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} style={{ backgroundColor: bodyBg }}>
                    <td
                      className="border px-3 py-2.5 text-left align-top wrap-break-word"
                      style={{ borderColor, color: QUOTATION_PDF_COLORS.slate800 }}
                    >
                      {row.detail.trim()}
                    </td>
                    <td
                      className="border px-3 py-2.5 text-right align-top tabular-nums whitespace-nowrap"
                      style={{ borderColor, color: QUOTATION_PDF_COLORS.slate900 }}
                    >
                      {row.cost.trim() ? <em>{row.cost.trim()}</em> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {milestoneLines.length > 0 ? (
          <div
            className={cn(
              "mt-1 w-full shrink-0 px-2 text-[14px] leading-relaxed md:text-[15px]",
              page2BlockMaxClass,
              tableBlockAlign === "left" && "mr-auto",
              tableBlockAlign === "center" && "mx-auto",
              tableBlockAlign === "right" && "ml-auto",
              headingAlignClass
            )}
            style={{ color: QUOTATION_PDF_COLORS.slate800 }}
          >
            <p className="font-bold" style={{ color: QUOTATION_PDF_COLORS.slate900 }}>
              Payment Milestone:
            </p>
            <ul className="mt-2 list-none space-y-1.5">
              {milestoneLines.map((line, idx) => (
                <li key={idx} className={milestoneRowClass}>
                  <span className="shrink-0" style={{ color: QUOTATION_PDF_COLORS.slate700 }} aria-hidden>
                    ◆
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </QuotationPageFrame>
  );
}
