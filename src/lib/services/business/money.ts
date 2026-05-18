export function decimalToNumber(value: unknown): number {
  if (value == null) return 0;
  const parsed = Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

export interface Money {
  amount: number;         // e.g., 100.50
  currency: string;       // e.g., "USD"
  amountBase: number;     // e.g., 369.14 (AED/INR base equivalent)
  exchangeRate: number;   // e.g., 3.6725
}

/**
 * Standardized Money Value Object (VO) enforcing rounding safety
 * and base currency exchange normalization.
 */
export class MoneyValueObject {
  static create(amount: number, currency: string, rate: number): Money {
    const roundedAmount = Math.round(amount * 100) / 100;
    const roundedBase = Math.round(roundedAmount * rate * 100) / 100;
    return {
      amount: roundedAmount,
      currency,
      amountBase: roundedBase,
      exchangeRate: rate,
    };
  }
}
