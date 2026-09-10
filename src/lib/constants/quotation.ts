export const QUOTATION_STATUSES = [
  "DRAFT",
  "SENT",
  "APPROVED",
  "REJECTED"
] as const;

export type QuotationStatus = typeof QUOTATION_STATUSES[number];
