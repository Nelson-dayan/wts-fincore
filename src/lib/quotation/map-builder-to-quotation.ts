import type { QuotationPageInput, QuotationItemInput } from "@/lib/services/business/quotation.service";
import type { QuotationData } from "@/types/quotation-generator";

export function parseCostFromGenerator(cost: string): number {
  const t = String(cost ?? "")
    .replace(/[^\d.,-]/g, "")
    .replace(/,/g, "");
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : 0;
}

export function pagesFromGeneratorData(data: QuotationData): QuotationPageInput[] {
  if (!data.pages || data.pages.length === 0) return [];
  
  return data.pages.map((p) => ({
    pageNumber: p.pageNumber,
    items: p.items.map((it) => ({
      number: it.number,
      name: it.name || "Item",
      displayName: "",
      description: it.description || "",
      quantity: it.quantity || 1,
      price: typeof it.price === "number" ? it.price : parseCostFromGenerator(String(it.price)),
    })),
  }));
}
