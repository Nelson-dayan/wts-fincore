export type PaymentFeeInput = {
  amount: number;
};

export type PaymentInput = {
  type: "PAYMENT" | "REFUND" | "ADJUSTMENT";
  exchangeRate: number;
  intendedAmount: number;
  receivedAmount: number;
  fees: PaymentFeeInput[];
};

export type ExpenseInput = {
  baseAmount: number;
  invoiceId?: string;
};

export function getPaymentSummary(payment: PaymentInput) {
  const isRefund = payment.type === "REFUND";
  const multiplier = isRefund ? -1 : 1;

  const totalFees = payment.fees?.reduce((sum, f) => sum + f.amount, 0) ?? 0;
  const totalFeesBase = totalFees * payment.exchangeRate;

  const intendedBase = payment.intendedAmount * payment.exchangeRate * multiplier;
  const receivedBase = payment.receivedAmount * payment.exchangeRate * multiplier;

  return {
    totalFees,
    totalFeesBase,
    intendedBase,
    receivedBase,
  };
}

export type AllocationInput = {
  amount: number; // In Invoice Currency
  amountBase: number; // In System Base Currency (INR)
};

export function getInvoiceSummary(allocations: AllocationInput[], invoiceTotal: number) {
  let totalAllocated = 0;
  let totalAllocatedBase = 0;

  for (const a of allocations) {
    totalAllocated += a.amount;
    totalAllocatedBase += a.amountBase;
  }

  const remaining = invoiceTotal - totalAllocated;
  const isOverpaid = totalAllocated > invoiceTotal;

  return {
    totalAllocated,
    totalAllocatedBase,
    remaining,
    isOverpaid,
    overpaidAmount: isOverpaid ? totalAllocated - invoiceTotal : 0
  };
}

export function getProjectOverview(payments: PaymentInput[], expenses: ExpenseInput[]) {
  // Revenue is the sum of all payments received for the project (in base currency)
  const totalReceivedBase = payments.reduce((sum, p) => sum + getPaymentSummary(p).receivedBase, 0);
  const totalFeesBase = payments.reduce((sum, p) => sum + getPaymentSummary(p).totalFeesBase, 0);
  const totalExpensesBase = expenses.reduce((sum, e) => sum + e.baseAmount, 0);

  // Profit is strictly what was received minus what was spent.
  const profitBase = totalReceivedBase - totalExpensesBase;

  return {
    totalReceivedBase,
    totalFeesBase,
    totalExpensesBase,
    profitBase
  };
}
