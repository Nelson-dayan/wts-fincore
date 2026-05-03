/**
 * Pure functions for financial calculations.
 * Used strictly to enforce calculation logic without side effects.
 */

export type PaymentFeeInput = {
  amount: number;
};

export type PaymentInput = {
  type: "PAYMENT" | "REFUND";
  exchangeRate: number;
  intendedAmount: number;
  receivedAmount: number;
  fees: PaymentFeeInput[];
};

export type InvoiceInput = {
  exchangeRate: number;
  totalAmount: number;
};

export type ExpenseInput = {
  baseAmount: number;
  invoiceId?: string;
};

export function getPaymentSummary(payment: PaymentInput) {
  const isRefund = payment.type === "REFUND";
  // For refunds, the amounts entered are positive but their mathematical impact is negative.
  const multiplier = isRefund ? -1 : 1;

  // Explicitly backend-calculated base fees.
  const totalFees = payment.fees.reduce((sum, f) => sum + f.amount, 0);
  const totalFeesBase = totalFees * payment.exchangeRate;

  // Base amounts mathematically adhere to refund multiplier
  const intendedBase = payment.intendedAmount * payment.exchangeRate * multiplier;
  const receivedBase = payment.receivedAmount * payment.exchangeRate * multiplier;

  // Expected base received = what we should have gotten after fees.
  const expectedReceivedBase = intendedBase - (totalFeesBase * multiplier);
  const mismatchBase = receivedBase - expectedReceivedBase;

  return {
    totalFees,
    totalFeesBase,
    intendedBase,
    receivedBase,
    mismatchBase,
  };
}

export function getInvoiceSummary(payments: PaymentInput[], invoice: InvoiceInput) {
  let totalIntendedBase = 0;
  let totalReceivedBase = 0;
  let totalFeesBase = 0;

  let totalForexDifference = 0;

  for (const p of payments) {
    const summary = getPaymentSummary(p);
    totalIntendedBase += summary.intendedBase;
    totalReceivedBase += summary.receivedBase;
    // Fees are accumulated positively regardless of payment or refund, as they are a lost cost.
    // However, if a fee is refunded, it should be negative. Typically refunds might not refund fees.
    // For simplicity, we assume fees on refunds are additional costs, or if they are refunded fees, 
    // the system should probably record a negative fee amount explicitly. 
    totalFeesBase += summary.totalFeesBase;

    // Forex Fluctuation specifically isolates the currency fluctuation apart from fees
    const isRefund = p.type === "REFUND";
    const multiplier = isRefund ? -1 : 1;
    
    // Fluctuation = (Payment Rate - Invoice Rate) * Intended Amount
    const diff = (p.exchangeRate - invoice.exchangeRate) * p.intendedAmount;
    totalForexDifference += diff * multiplier;
  }

  const invoiceAmountBase = invoice.totalAmount * invoice.exchangeRate;

  const remainingIntendedBase = invoiceAmountBase - totalIntendedBase;
  const remainingActualBase = invoiceAmountBase - totalReceivedBase;

  const overpaidAmountBase = totalReceivedBase > invoiceAmountBase 
    ? totalReceivedBase - invoiceAmountBase 
    : 0;

  return {
    invoiceAmountBase,
    totalIntendedBase,
    totalReceivedBase,
    totalFeesBase,
    totalForexDifference,
    remainingIntendedBase,
    remainingActualBase,
    overpaidAmountBase
  };
}

export function getProjectOverview(payments: PaymentInput[], expenses: ExpenseInput[]) {
  const totalReceivedBase = payments.reduce((sum, p) => sum + getPaymentSummary(p).receivedBase, 0);
  const totalFeesBase = payments.reduce((sum, p) => sum + getPaymentSummary(p).totalFeesBase, 0);
  const totalExpensesBase = expenses.reduce((sum, e) => sum + e.baseAmount, 0);

  // Profit is strictly what was received minus what was spent.
  // Note: Fees are already considered "lost" since totalReceivedBase is post-fees.
  const profitBase = totalReceivedBase - totalExpensesBase;

  return {
    totalReceivedBase,
    totalFeesBase,
    totalExpensesBase,
    profitBase
  };
}
