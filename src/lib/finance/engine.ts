import { MoneyInput, FinanceTotals } from "@/lib/types";
import { DEFAULT_CURRENCY } from "@/lib/constants/finance";


/**
 * Robustly rounds a monetary value to 2 decimal places to avoid floating point drift.
 * Uses Number.EPSILON to ensure exact half-round up behavior.
 * Example: 999.9999997 -> 1000.00
 */
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Formats a number to a currency string using Intl.NumberFormat
 */
export function formatCurrency(value: number, currency = DEFAULT_CURRENCY): string {
  const locale = currency === "INR" ? "en-IN" : "en-AE";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(roundMoney(value));
}

/** Adds two monetary values safely */
export function addMoney(a: number, b: number): number {
  return roundMoney(a + b);
}

/** Subtracts two monetary values safely (a - b) */
export function subtractMoney(a: number, b: number): number {
  return roundMoney(a - b);
}


/**
 * Computes the subtotal for a single line item.
 */
export function calculateLineSubtotal(quantity: number, unitPrice: number): number {
  const qty = quantity || 0;
  const price = unitPrice || 0;
  return roundMoney(qty * price);
}

/**
 * Computes the global discount amount.
 */
export function calculateDiscount(subtotal: number, discountValue: number): number {
  return roundMoney(Math.max(0, discountValue));
}

/**
 * Computes the tax amount given a taxable amount and a tax rate.
 */
export function calculateTax(taxableAmount: number, taxRate: number): number {
  const amount = Math.max(0, taxableAmount);
  const rate = Math.max(0, taxRate);
  return roundMoney((amount * rate) / 100);
}

/**
 * Computes grand total.
 */
export function calculateGrandTotal(taxableAmount: number, taxAmount: number): number {
  return roundMoney(taxableAmount + taxAmount);
}

/**
 * Applies an exchange rate to a base amount.
 */
export function applyExchangeRate(amount: number, exchangeRate: number = 1): number {
  return roundMoney(amount * exchangeRate);
}

/**
 * Computes global totals for an array of line items, applying a global discount and tax rate.
 */
export function computeTotals(
  items: MoneyInput[],
  globalDiscount: number = 0,
  globalTaxRate: number = 0
): FinanceTotals {
  let rawSubtotal = 0;

  for (const item of items) {
    rawSubtotal += calculateLineSubtotal(item.quantity, item.unitPrice);
  }

  const subtotal = roundMoney(rawSubtotal);
  const discount = calculateDiscount(subtotal, globalDiscount);
  const taxableAmount = Math.max(0, subtotal - discount);
  const tax = calculateTax(taxableAmount, globalTaxRate);
  const total = calculateGrandTotal(taxableAmount, tax);

  return {
    subtotal,
    tax,
    total,
  };
}
