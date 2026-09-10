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
