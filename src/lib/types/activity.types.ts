export const ACTIVITY_ACTIONS = [
  "INVOICE_CREATED",
  "INVOICE_UPDATED",
  "INVOICE_STATUS_CHANGED",
  "PAYMENT_RECORDED",
  "QUOTATION_APPROVED",
  "QUOTATION_REJECTED",
  "QUOTATION_CREATED",
  "QUOTATION_UPDATED",
  "QUOTATION_DELETED",
  "EXPENSE_CREATED"
] as const;

export type ActivityAction = typeof ACTIVITY_ACTIONS[number];

export interface ActivityMetadata {
  previous?: unknown;
  current?: unknown;
  changedFields?: string[];
  [key: string]: unknown;
}
