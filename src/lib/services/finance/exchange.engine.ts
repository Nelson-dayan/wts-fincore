import { SYSTEM_BASE_CURRENCY } from "@/lib/constants/finance";

/**
 * Converts an amount to the system base currency (INR).
 */
export function convertToBase(amount: number, rateToBase: number): number {
  return amount * rateToBase;
}

/**
 * Converts an amount between two arbitrary currencies.
 */
export function convert(amount: number, rate: number): number {
  return amount * rate;
}

/**
 * Standardizes currency labels.
 */
export function getCurrencyLabel(currency: string): string {
  return String(currency || SYSTEM_BASE_CURRENCY).toUpperCase();
}
