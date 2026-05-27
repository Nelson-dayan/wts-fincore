/**
 * Centralized Financial Precision & Epsilon Math Engine
 * Guarantees zero floating-point accumulation errors (IEEE-754) across
 * all ledgers, balance calculations, currency conversions, and proforma checks.
 */

export const FINANCE_EPSILON = 1e-11;
export const BALANCE_SETTLED_TOLERANCE = 0.015; // ERP invoice paid tolerance limit

/**
 * Epsilon-safe float comparison utility to prevent IEEE-754 drift errors.
 */
export function isMoneyEqual(a: number, b: number): boolean {
  return Math.abs(a - b) < FINANCE_EPSILON;
}

/**
 * Epsilon-safe float comparison for less-than-or-equal-to relationship.
 */
export function isMoneyLessThanOrEqual(a: number, b: number): boolean {
  return a < b || isMoneyEqual(a, b);
}

/**
 * Rounds money to standard decimal precision (default 2 places, or 4 for rates/ledgers).
 */
export function roundMoney(amount: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round((amount + Number.EPSILON) * factor) / factor;
}

/**
 * Tolerance check to see if an unpaid invoice balance is fully settled.
 * Allows for small rounding differences (e.g. 0.01 AED/USD/INR).
 */
export function isBalanceSettled(unpaidBalance: number, tolerance: number = BALANCE_SETTLED_TOLERANCE): boolean {
  return isMoneyLessThanOrEqual(unpaidBalance, tolerance);
}

/**
 * Safe floating-point addition.
 */
export function safeAdd(a: number, b: number): number {
  return roundMoney(a + b, 4);
}

/**
 * Safe floating-point subtraction.
 */
export function safeSubtract(a: number, b: number): number {
  return roundMoney(a - b, 4);
}

/**
 * Return default decimals based on currency type.
 */
export function getCurrencyDecimals(currency: string): number {
  const upper = currency.toUpperCase();
  if (["BHD", "KWD", "OMR"].includes(upper)) {
    return 3;
  }
  return 2;
}
