export function decimalToNumber(value: unknown): number {
  if (value == null) return 0;
  const parsed = Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
}
