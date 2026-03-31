/** Pure totals helper — safe for Client Components (no Mongoose / Node-only APIs). */

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
  let subtotal = 0;
  for (const p of pages) {
    for (const row of p.items) {
      const qty = Number(row.quantity) || 0;
      const rate = Number(row.price) || 0;
      subtotal += qty * rate;
    }
  }
  const rate = Math.max(0, taxRatePercent);
  const tax = taxEnabled ? Math.round(subtotal * (rate / 100) * 100) / 100 : 0;
  const total = Math.round((subtotal + tax) * 100) / 100;
  return { subtotal, tax, total };
}
