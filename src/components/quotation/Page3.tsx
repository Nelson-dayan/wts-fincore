import { QUOTATION_PDF_COLORS } from "@/lib/quotation/quotation-pdf-colors";
import type { QuotationData } from "@/types/quotation-generator";
import { QuotationPageFrame } from "./QuotationPageFrame";

type Page3Props = {
  data: QuotationData;
  globalPageNum: number;
};

export function Page3({ data, globalPageNum }: Page3Props) {
  const {
    page3Title,
    contactName,
    companyName,
    companyAddress,
    contactPhone,
    contactEmail,
    contactTextAlign,
  } = data;

  const heading = page3Title.trim();
  const name = contactName.trim();
  const co = companyName.trim();
  const addr = companyAddress.trim();
  const tel = contactPhone.trim();
  const mail = contactEmail.trim();

  const hasBody = Boolean(name || co || addr || tel || mail);
  const textAlignClass =
    contactTextAlign === "center"
      ? "text-center"
      : contactTextAlign === "right"
        ? "text-right"
        : "text-left";

  const contactInsetClass =
    contactTextAlign === "left"
      ? "pl-[2%] pr-2"
      : contactTextAlign === "right"
        ? "pr-[2%] pl-2"
        : "px-[2%]";

  return (
    <QuotationPageFrame data={data} page={globalPageNum}>
      <div
        className={`flex h-full min-h-0 flex-col justify-end pb-2 pt-4 ${contactInsetClass}`}
      >
        <div
          className={`max-w-xl space-y-4 text-[14px] leading-relaxed md:text-[15px] ${textAlignClass}`}
          style={{ color: QUOTATION_PDF_COLORS.slate800 }}
        >
          {heading ? (
            <h2
              className="text-base font-bold uppercase tracking-wide md:text-lg"
              style={{ color: QUOTATION_PDF_COLORS.slate900 }}
            >
              {heading}
            </h2>
          ) : null}

          {hasBody ? (
            <div className="space-y-3">
              {name ? (
                <p
                  className="text-[15px] font-bold md:text-base"
                  style={{ color: QUOTATION_PDF_COLORS.slate900 }}
                >
                  {name}
                </p>
              ) : null}
              {co ? <p>{co}</p> : null}
              {addr ? <p className="whitespace-pre-line">{addr}</p> : null}
              {tel ? (
                <p>
                  <span className="font-semibold" style={{ color: QUOTATION_PDF_COLORS.slate900 }}>
                    Tel:{" "}
                  </span>
                  {tel}
                </p>
              ) : null}
              {mail ? (
                <p>
                  <span className="font-semibold" style={{ color: QUOTATION_PDF_COLORS.slate900 }}>
                    Email:{" "}
                  </span>
                  {mail}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </QuotationPageFrame>
  );
}
