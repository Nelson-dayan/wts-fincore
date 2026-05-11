/** Pure totals helper — safe for Client Components (no Mongoose / Node-only APIs). */
import { computeTotals } from "@/lib/finance/engine";


export type InvoiceTotalsLine = {
  number: number;
  name: string;
  description: string;
  quantity: number;
  price: number;
};

export type InvoiceTotalsPage = { pageNumber: number; items: InvoiceTotalsLine[] };

export function computeInvoiceTotals(
  pages: InvoiceTotalsPage[],
  taxRatePercent: number,
  taxEnabled: boolean
): { subtotal: number; tax: number; total: number } {
  const items = pages.flatMap(p => p.items).map(item => ({
    quantity: Number(item.quantity) || 0,
    unitPrice: Number(item.price) || 0
  }));

  return computeTotals(items, 0, taxEnabled ? taxRatePercent : 0);
}
