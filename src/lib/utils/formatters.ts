/**
 * Unified Financial & Date Formatting Utilities for Sec-DocuTrade Enterprise UI
 */

/**
 * Formats a monetary value consistently across the entire platform.
 * Example: formatCurrency(52500, "AED") => "AED 52,500.00"
 */
export function formatCurrency(
  amount: number | string | null | undefined,
  currency = "AED",
  showDecimals = true
): string {
  if (amount == null || amount === "") return `${currency} 0.00`;
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return `${currency} 0.00`;

  const formattedNum = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(num);

  return `${currency} ${formattedNum}`;
}

/**
 * Formats a date string or object into a standardized enterprise date string.
 * Example: formatDate("2026-08-11T10:00:00Z") => "Aug 11, 2026"
 */
export function formatDate(
  dateInput: string | Date | number | null | undefined,
  includeTime = false
): string {
  if (!dateInput) return "—";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "—";

  if (includeTime) {
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Capitalizes or formats status tokens into clean labels.
 */
export function formatStatusLabel(status: string): string {
  if (!status) return "—";
  return status
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
