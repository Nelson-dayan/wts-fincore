export const INVOICE_STATUSES = [
  "DRAFT",
  "SENT",
  "PARTIAL",
  "PAID",
  "OVERDUE",
  "CANCELLED",
] as const;

export type InvoiceStatus = typeof INVOICE_STATUSES[number];
