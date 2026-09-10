export const PAYMENT_STATUSES = [
  "PENDING",
  "COMPLETED",
  "FAILED",
  "REFUNDED"
] as const;

export type PaymentStatus = typeof PAYMENT_STATUSES[number];
