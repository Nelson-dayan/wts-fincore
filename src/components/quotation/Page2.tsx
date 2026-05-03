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
  pageIndex: number;
  globalPageNum: number;
};

function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}

export function Page2({ data, pageIndex, globalPageNum }: Page2Props) {
  const {
    page1Title,
    page2Title,
    description,
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
    pages,
    currency,
    taxRate,
    discount,
  } = data;
  const isLandscape = pageOrientation === "landscape";
  const pageData = pages[pageIndex];
  const rows = pageData?.items && pageData.items.length > 0 ? pageData.items : [];
  
  const hDetail = tableHeaderDetail.trim() || "Description";
  const hCost = tableHeaderCost.trim() || "Total";
  const showThead = true;

  const isLastPage = pageIndex === pages.length - 1;

  // Totals Calculation (only on last page)
  const subtotal = pages.reduce(
    (sum, p) =>
      sum +
      p.items.reduce((rowSum, row) => rowSum + row.quantity * row.price, 0),
    0
  );
  
  const discountAmount = discount;
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxAmount = (taxableAmount * taxRate) / 100;
  const grandTotal = taxableAmount + taxAmount;

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
    <QuotationPageFrame data={data} page={globalPageNum}>
      <div className="flex h-full min-h-0 flex-col justify-start gap-5 pt-1">
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
                <col style={{ width: "6%" }} />
                <col style={{ width: "44%" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "21%" }} />
                <col style={{ width: "21%" }} />
              </colgroup>
              {showThead ? (
                <thead>
                  <tr style={{ backgroundColor: headerBg }}>
                    <th
                      className="border px-3 py-2.5 text-center font-bold"
                      style={{ borderColor, color: QUOTATION_PDF_COLORS.slate900 }}
                    >
                      #
                    </th>
                    <th
                      className="border px-3 py-2.5 text-left font-bold wrap-break-word"
                      style={{ borderColor, color: QUOTATION_PDF_COLORS.slate900 }}
                    >
                      {hDetail}
                    </th>
                    <th
                      className="border px-3 py-2.5 text-center font-bold"
                      style={{ borderColor, color: QUOTATION_PDF_COLORS.slate900 }}
                    >
                      Qty
                    </th>
                    <th
                      className="border px-3 py-2.5 text-right font-bold wrap-break-word"
                      style={{ borderColor, color: QUOTATION_PDF_COLORS.slate900 }}
                    >
                      Price ({currency})
                    </th>
                    <th
                      className="border px-3 py-2.5 text-right font-bold wrap-break-word"
                      style={{ borderColor, color: QUOTATION_PDF_COLORS.slate900 }}
                    >
                      {hCost} ({currency})
                    </th>
                  </tr>
                </thead>
              ) : null}
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} style={{ backgroundColor: bodyBg }}>
                    <td
                      className="border px-3 py-2.5 text-center align-top tabular-nums"
                      style={{ borderColor, color: QUOTATION_PDF_COLORS.slate800 }}
                    >
                      {row.number || i + 1}
                    </td>
                    <td
                      className="border px-3 py-2.5 text-left align-top wrap-break-word"
                      style={{ borderColor, color: QUOTATION_PDF_COLORS.slate800 }}
                    >
                      <div className="font-semibold text-slate-900">{row.name.trim()}</div>
                      {row.description.trim() && (
                        <div className="mt-1 text-slate-700 whitespace-pre-wrap text-[12px]">{row.description.trim()}</div>
                      )}
                    </td>
                    <td
                      className="border px-3 py-2.5 text-center align-top tabular-nums"
                      style={{ borderColor, color: QUOTATION_PDF_COLORS.slate800 }}
                    >
                      {row.quantity}
                    </td>
                    <td
                      className="border px-3 py-2.5 text-right align-top tabular-nums"
                      style={{ borderColor, color: QUOTATION_PDF_COLORS.slate800 }}
                    >
                      {formatMoney(row.price)}
                    </td>
                    <td
                      className="border px-3 py-2.5 text-right align-top tabular-nums whitespace-nowrap font-medium"
                      style={{ borderColor, color: QUOTATION_PDF_COLORS.slate900 }}
                    >
                      {formatMoney(row.quantity * row.price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {isLastPage && (
            <div className="mt-4 flex justify-end">
              <div className="w-64 rounded-lg border p-3 text-[13px] md:text-[14px]" style={{ borderColor, backgroundColor: bodyBg, color: QUOTATION_PDF_COLORS.slate900 }}>
                <div className="flex justify-between py-1">
                  <span style={{ color: QUOTATION_PDF_COLORS.slate700 }}>Subtotal:</span>
                  <span className="font-medium tabular-nums">{formatMoney(subtotal)} {currency}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between py-1">
                    <span style={{ color: QUOTATION_PDF_COLORS.slate700 }}>Discount:</span>
                    <span className="font-medium tabular-nums text-red-600">-{formatMoney(discountAmount)} {currency}</span>
                  </div>
                )}
                {taxRate > 0 && (
                  <div className="flex justify-between py-1 border-b pb-2 mb-2" style={{ borderColor }}>
                    <span style={{ color: QUOTATION_PDF_COLORS.slate700 }}>Tax ({taxRate}%):</span>
                    <span className="font-medium tabular-nums">{formatMoney(taxAmount)} {currency}</span>
                  </div>
                )}
                <div className="flex justify-between pt-1 font-bold text-[15px]">
                  <span>Total:</span>
                  <span className="tabular-nums">{formatMoney(grandTotal)} {currency}</span>
                </div>
              </div>
            </div>
          )}
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
