/**
 * Maximum invoice documents per purchase order.
 * Use `null` for no limit (any number of invoices per PO).
 */
export const MAX_INVOICES_PER_PURCHASE_ORDER: number | null = null;

/** True when `count` has reached the configured per-PO cap (always false when cap is null). */
export function invoiceCountAtOrOverCap(count: number): boolean {
  const cap = MAX_INVOICES_PER_PURCHASE_ORDER;
  return cap !== null && Number.isFinite(cap) && count >= cap;
}
