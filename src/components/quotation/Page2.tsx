import { QUOTATION_PDF_COLORS } from "@/lib/quotation/quotation-pdf-colors";
import type { QuotationData } from "@/types/quotation-generator";
import { QuotationPageFrame } from "./QuotationPageFrame";

const TABLE_HEAD_BG = "#E6F2FF";
const TABLE_BODY_BG = "#f4f9fd";
const TABLE_BORDER = "#cfe8fc";

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
  } = data;
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

  return (
    <QuotationPageFrame data={data} page={2}>
      <div className="flex h-full min-h-0 flex-col justify-center gap-5 pt-1">
        {customTitle ? (
          <h2
            className="text-center text-[17px] font-normal leading-snug md:text-[19px]"
            style={{ color: QUOTATION_PDF_COLORS.slate900 }}
          >
            {customTitle}
          </h2>
        ) : showComposedTitle ? (
          <h2
            className="text-center text-[17px] font-normal leading-snug md:text-[19px]"
            style={{ color: QUOTATION_PDF_COLORS.slate900 }}
          >
            {p1}
            <span style={{ color: QUOTATION_PDF_COLORS.slate900 }}>- </span>
            <strong className="font-bold">QUOTATION</strong>
          </h2>
        ) : null}

        {description.trim() ? (
          <p
            className="px-2 text-center text-[14px] leading-relaxed md:text-[15px]"
            style={{ color: QUOTATION_PDF_COLORS.slate800 }}
          >
            {description.trim()}
          </p>
        ) : null}

        <section className="mx-auto w-full max-w-4xl">
          <div
            className="overflow-hidden rounded-lg border"
            style={{
              borderColor: TABLE_BORDER,
              backgroundColor: TABLE_BODY_BG,
              boxShadow: QUOTATION_PDF_COLORS.shadowSm,
            }}
          >
            <table className="w-full border-collapse text-center text-[13px] md:text-[14px]">
              {showThead ? (
                <thead>
                  <tr style={{ backgroundColor: TABLE_HEAD_BG }}>
                    <th
                      className="border px-3 py-2.5 font-bold"
                      style={{ borderColor: TABLE_BORDER, color: QUOTATION_PDF_COLORS.slate900 }}
                    >
                      {hDetail}
                    </th>
                    <th
                      className="border px-3 py-2.5 font-bold"
                      style={{ borderColor: TABLE_BORDER, color: QUOTATION_PDF_COLORS.slate900 }}
                    >
                      {hCost}
                    </th>
                  </tr>
                </thead>
              ) : null}
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} style={{ backgroundColor: TABLE_BODY_BG }}>
                    <td
                      className="border px-3 py-2.5 align-top"
                      style={{ borderColor: TABLE_BORDER, color: QUOTATION_PDF_COLORS.slate800 }}
                    >
                      {row.detail.trim()}
                    </td>
                    <td
                      className="border px-3 py-2.5 align-top tabular-nums"
                      style={{ borderColor: TABLE_BORDER, color: QUOTATION_PDF_COLORS.slate900 }}
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
            className="mx-auto mt-1 w-full max-w-4xl pl-1 text-left text-[14px] leading-relaxed md:text-[15px]"
            style={{ color: QUOTATION_PDF_COLORS.slate800 }}
          >
            <p className="font-bold" style={{ color: QUOTATION_PDF_COLORS.slate900 }}>
              Payment Milestone:
            </p>
            <ul className="mt-2 list-none space-y-1.5 pl-0">
              {milestoneLines.map((line, idx) => (
                <li key={idx} className="flex gap-2 pl-1">
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
