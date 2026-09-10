/**
 * Centralized Forex & Precision Engine
 * Part of Phase 1: Pure FX Engine Refactoring.
 * Strictly separates calculations into Layer 1 (Base Accounting ledger), 
 * Layer 2 (Treasury account display), and Layer 3 (Original documents).
 */

export const BASE_ACCOUNTING_CURRENCY = "INR";

export interface FXRates {
  [currency: string]: number;
}

export const STATIC_FX_RATES: FXRates = {
  INR: 1.0,
  USD: 83.0,
  AED: 22.6,
  RM: 18.2,
  SGD: 62.5,
  AUD: 54.5,
};

export type RateSource = "LIVE_API" | "FALLBACK_STATIC" | "MANUAL_OVERRIDE";

export interface ConversionResult {
  amount: number;
  rate: number;
  source: RateSource;
  isStale?: boolean;
}

/**
 * Epsilon-safe float comparison utility to prevent IEEE-754 drift errors.
 */
export function floatEquals(a: number, b: number): boolean {
  return Math.abs(a - b) < 1e-11;
}

/**
 * Epsilon-safe float comparison for less-than-or-equal-to relationship.
 */
export function floatLessThanOrEqual(a: number, b: number): boolean {
  return a < b || floatEquals(a, b);
}

/**
 * Universal Currency Conversion Engine.
 * Stretches or compresses currency dimensions based on relative multiplier rates relative to INR.
 * Rates must be specified as: 1 Foreign Unit = rates[Foreign] INR.
 */
export function convertCurrency({
  amount,
  fromCurrency,
  toCurrency,
  rates = STATIC_FX_RATES,
  source = "LIVE_API"
}: {
  amount: number;
  fromCurrency: string;
  toCurrency: string;
  rates?: FXRates;
  source?: RateSource;
}): ConversionResult {
  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();

  // HARD BYPASS FOR SAME-CURRENCY
  if (from === to) {
    return {
      amount,
      rate: 1.0,
      source: "FALLBACK_STATIC" // same currency is static, bypassing live calls
    };
  }

  const fromRate = rates[from];
  const toRate = rates[to];

  if (!fromRate || !toRate) {
    throw new Error(`Forex Engine: Missing exchange rate mapping for ${from} or ${to}`);
  }

  // conversionRate = fromRate / toRate
  const rate = fromRate / toRate;
  
  return {
    amount: amount * rate,
    rate,
    source
  };
}

/**
 * Normalize any currency amount to the system's Base Accounting Ledger Currency (INR - Layer 1).
 */
export function normalizeToBase({
  amount,
  currency,
  rates = STATIC_FX_RATES,
  source = "LIVE_API"
}: {
  amount: number;
  currency: string;
  rates?: FXRates;
  source?: RateSource;
}): ConversionResult {
  return convertCurrency({
    amount,
    fromCurrency: currency,
    toCurrency: BASE_ACCOUNTING_CURRENCY,
    rates,
    source
  });
}

/**
 * Converts a Base Accounting Ledger Amount (INR) into Layer 2 Treasury Wallet Currency.
 */
export function convertBaseToTreasury({
  baseAmount,
  treasuryCurrency,
  rates = STATIC_FX_RATES,
  source = "LIVE_API"
}: {
  baseAmount: number;
  treasuryCurrency: string;
  rates?: FXRates;
  source?: RateSource;
}): ConversionResult {
  return convertCurrency({
    amount: baseAmount,
    fromCurrency: BASE_ACCOUNTING_CURRENCY,
    toCurrency: treasuryCurrency,
    rates,
    source
  });
}
