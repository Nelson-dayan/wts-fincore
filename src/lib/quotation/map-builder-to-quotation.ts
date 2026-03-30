import type { QuotationPageInput, QuotationItemInput } from "@/lib/services/business/quotation.service";
import type { QuotationData } from "@/types/quotation-generator";

export function parseCostFromGenerator(cost: string): number {
  const t = String(cost ?? "")
    .replace(/[^\d.,-]/g, "")
    .replace(/,/g, "");
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : 0;
}

/** One DB page from PDF builder line items (detail + cost). */
export function pagesFromGeneratorData(data: QuotationData): QuotationPageInput[] {
  const raw = data.items?.length ? data.items : [{ detail: "", cost: "" }];
  const items: QuotationItemInput[] = raw.map((it, i) => {
    const detail = String(it.detail ?? "").trim();
    const name = detail || `Item ${i + 1}`;
    return {
      number: i + 1,
      name,
      displayName: "",
      description: "",
      quantity: 1,
      price: parseCostFromGenerator(String(it.cost ?? "")),
    };
  });
  return [{ pageNumber: 1, items }];
}
