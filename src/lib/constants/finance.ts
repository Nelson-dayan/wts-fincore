export const DEFAULT_CURRENCY = "INR";
export const SYSTEM_BASE_CURRENCY = "INR";
export const DECIMAL_PRECISION = 2;

export const SUPPORTED_CURRENCIES = [
  { value: "INR", label: "INR" },
  { value: "RM", label: "RM" },
  { value: "AED", label: "AED" },
  { value: "USD", label: "USD" },
  { value: "SGD", label: "SGD" },
  { value: "AUD", label: "AUD" },
] as const;

export const SUPPORTED_CURRENCY_VALUES = SUPPORTED_CURRENCIES.map(c => c.value);

// Invoice and Proforma line item tax options (matching backend default)
export const LINE_ITEM_TAX_OPTIONS = [
  { value: 0, label: "GST Excluded" },
  { value: 5, label: "GST 5%" },
  { value: 12, label: "GST 12%" },
  { value: 18, label: "GST 18%" },
  { value: 28, label: "GST 28%" },
] as const;

export const LINE_ITEM_TAX_DEFAULT = 0;

// Purchase Order line item tax options
export const PO_LINE_ITEM_TAX_OPTIONS = [
  { value: 0, label: "No Tax" },
  { value: 12, label: "12%" },
  { value: 18, label: "18%" },
] as const;

export const PO_LINE_ITEM_TAX_DEFAULT = 0;

// Quote line item tax options
export const QUOTE_LINE_ITEM_TAX_OPTIONS = [
  { value: 0, label: "GST Excluded" },
  { value: 5, label: "GST 5%" },
  { value: 12, label: "GST 12%" },
  { value: 18, label: "GST 18%" },
  { value: 28, label: "GST 28%" },
] as const;

export const QUOTE_LINE_ITEM_TAX_DEFAULT = 0;

// Centralized Static Benchmark Forex Rates (relative to INR)
export const STATIC_FX_RATES: Record<string, number> = {
  INR: 1.0,
  USD: 83.0,
  AED: 22.6,
  RM: 18.2,
  SGD: 62.5,
  AUD: 54.5,
};

/**
 * Returns currency minor units / decimals.
 * Standard currencies (USD, AED, INR, AUD, SGD, RM) use 2.
 * High-precision currencies (BHD, KWD, OMR, JOD) use 3. Zero-decimal (JPY, KRW) use 0.
 */
export function getCurrencyDecimals(currency: string): number {
  const upper = String(currency || "").toUpperCase();
  if (["JPY", "KRW", "VND", "CLP"].includes(upper)) return 0;
  if (["BHD", "KWD", "OMR", "JOD"].includes(upper)) return 3;
  return 2;
}

/**
 * Calculates market benchmark rate between two currencies relative to INR base.
 */
export function getBenchmarkRate(fromCurrency: string, toCurrency: string): number {
  const from = String(fromCurrency || "").toUpperCase();
  const to = String(toCurrency || "").toUpperCase();
  if (from === to) return 1.0;
  const fromRate = STATIC_FX_RATES[from] || 1.0;
  const toRate = STATIC_FX_RATES[to] || 1.0;
  return fromRate / toRate;
}
