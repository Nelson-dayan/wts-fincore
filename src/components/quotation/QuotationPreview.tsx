"use client";

import { forwardRef } from "react";
import type { QuotationData } from "@/types/quotation-generator";
import { Page1 } from "./Page1";
import { Page2 } from "./Page2";
import { Page3 } from "./Page3";

export type QuotationPreviewProps = {
  data: QuotationData;
};

export const QuotationPreview = forwardRef<HTMLDivElement, QuotationPreviewProps>(
  function QuotationPreview({ data }, ref) {
    return (
      <div
        ref={ref}
        className="quotation-preview-root flex w-full flex-col items-center gap-10 pb-8 pt-2"
      >
        <Page1 data={data} />
        {data.pages.map((page, idx) => (
          <Page2
            key={idx}
            data={data}
            pageIndex={idx}
            globalPageNum={idx + 2}
          />
        ))}
        <Page3 data={data} globalPageNum={data.pages.length + 2} />
      </div>
    );
  }
);

QuotationPreview.displayName = "QuotationPreview";
