/** Client-side ref / document code for the PDF builder (same shape as DB quotationNumber). */
export function generateQuotationRefNo(date = new Date()): string {
  const d = date.toISOString().slice(0, 10).replace(/-/g, "");
  const bytes = new Uint8Array(4);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  const suffix = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
  return `QT-${d}-${suffix}`;
}
