export function decimalToNumber(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (typeof value === "object") {
    const valObj = value as Record<string, unknown>;
    if (valObj.$numberDecimal != null) {
      const parsed = Number.parseFloat(String(valObj.$numberDecimal));
      return Number.isFinite(parsed) ? parsed : 0;
    }
    if (valObj.value != null) {
      return decimalToNumber(valObj.value);
    }
    if (typeof valObj.toString === "function" && valObj.toString !== Object.prototype.toString) {
      const parsed = Number.parseFloat(valObj.toString());
      return Number.isFinite(parsed) ? parsed : 0;
    }
  }
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
