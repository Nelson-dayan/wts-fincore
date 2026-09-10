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
  "INVOICE_DELETED",
  "EXPENSE_CREATED",
  "PAYMENT_DELETED",
  "TRANSFER_CREATED",
  "created_client",
  "updated_client",
  "deleted_client",
  "created_user",
  "updated_user",
  "deleted_user",
  "created_company",
  "updated_company",
  "deleted_company",
  "created_purchase_order",
  "updated_purchase_order",
  "deleted_purchase_order",
  "created_project",
  "updated_project",
  "deleted_project",
  "INVOICE_REMINDER_SENT",
  "created_invoice",
  "updated_company_settings",
  "created_expense",
  "deleted_expense"
] as const;

export type ActivityAction = typeof ACTIVITY_ACTIONS[number];

export interface ActivityMetadata {
  previous?: unknown;
  current?: unknown;
  changedFields?: string[];
  [key: string]: unknown;
}
