import { formatQuotationCoverDate } from "@/lib/quotation/quotation-display";
import { QUOTATION_PDF_COLORS } from "@/lib/quotation/quotation-pdf-colors";
import type { QuotationData } from "@/types/quotation-generator";
import { QuotationPageFrame } from "./QuotationPageFrame";

type Page1Props = {
  data: QuotationData;
};

export function Page1({ data }: Page1Props) {
  const {
    page1Title,
    clientName,
    refNo,
    companyName,
    companyAddress,
    date,
    accentColor,
    coverTextAlign,
  } = data;
  const title = page1Title.trim();
  const client = clientName.trim();
  const ref = refNo.trim();
  const name = companyName.trim();
  const addr = companyAddress.trim();
  const dateStr = formatQuotationCoverDate(date);

  const showHero = Boolean(title || client);
  const showBody = Boolean(ref || name || addr);
  const showDate = Boolean(dateStr);

  const textAlignClass =
    coverTextAlign === "left"
      ? "text-left"
      : coverTextAlign === "right"
        ? "text-right"
        : "text-center";

  const bodyInsetClass =
    coverTextAlign === "left"
      ? "pl-[4%] pr-2"
      : coverTextAlign === "right"
        ? "pr-[4%] pl-2"
        : "px-2";

  return (
    <QuotationPageFrame data={data} page={1}>
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex min-h-0 flex-1 flex-col justify-center gap-6">
          {showHero ? (
            <h1
              className={`px-2 text-[19px] font-normal leading-snug tracking-tight md:text-[21px] ${textAlignClass}`}
              style={{ color: QUOTATION_PDF_COLORS.slate900 }}
            >
              {title ? (
                <span className="font-semibold" style={{ color: accentColor }}>
                  {title}
                </span>
              ) : null}
              {title && client ? <> </> : null}
              {client ? (
                <>
                  {title ? (
                    <em className="italic" style={{ color: QUOTATION_PDF_COLORS.slate800 }}>
                      Quotation to{" "}
                    </em>
                  ) : null}
                  <span className="font-semibold" style={{ color: QUOTATION_PDF_COLORS.slate900 }}>
                    {client}
                  </span>
                </>
              ) : null}
            </h1>
          ) : null}

          {showBody ? (
            <div
              className={`mx-auto w-full max-w-2xl space-y-3 text-[14px] leading-relaxed md:text-[15px] ${textAlignClass} ${bodyInsetClass}`}
              style={{ color: QUOTATION_PDF_COLORS.slate800 }}
            >
              {ref ? (
                <p>
                  <span className="font-semibold" style={{ color: QUOTATION_PDF_COLORS.slate900 }}>
                    Quotation no:{" "}
                  </span>
                  {ref}
                </p>
              ) : null}
              {name || addr ? (
                <div className="space-y-0.5">
                  {name ? (
                    <p className="font-semibold" style={{ color: QUOTATION_PDF_COLORS.slate900 }}>
                      {name}
                    </p>
                  ) : null}
                  {addr ? <p className="whitespace-pre-line">{addr}</p> : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {showDate ? (
          <div
            className="mt-auto shrink-0 pt-4 text-right text-[14px] md:text-[15px]"
            style={{ color: QUOTATION_PDF_COLORS.slate800 }}
          >
            <p>
              <span className="font-semibold" style={{ color: QUOTATION_PDF_COLORS.slate900 }}>
                Date:{" "}
              </span>
              {dateStr}
            </p>
          </div>
        ) : null}
      </div>
    </QuotationPageFrame>
  );
}
