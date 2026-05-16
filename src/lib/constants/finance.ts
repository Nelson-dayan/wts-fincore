export const DEFAULT_CURRENCY = "INR";
export const SYSTEM_BASE_CURRENCY = "INR";
export const DECIMAL_PRECISION = 2;

export const SUPPORTED_CURRENCIES = [
  { value: "INR", label: "INR" },
  { value: "RM", label: "RM" },
  { value: "AED", label: "AED" },
  { value: "USD", label: "USD" },
  { value: "SGD", label: "SGD" },
] as const;

export const SUPPORTED_CURRENCY_VALUES = SUPPORTED_CURRENCIES.map(c => c.value);
