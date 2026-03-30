/** "21st Oct 2025" style for quotation cover date line. */
export function formatQuotationCoverDate(isoOrText: string): string {
  if (!isoOrText?.trim()) return "";
  const d = new Date(isoOrText);
  if (Number.isNaN(d.getTime())) return isoOrText.trim();
  const day = d.getDate();
  const ord =
    day % 10 === 1 && day !== 11
      ? "st"
      : day % 10 === 2 && day !== 12
        ? "nd"
        : day % 10 === 3 && day !== 13
          ? "rd"
          : "th";
  const mon = d.toLocaleDateString("en-GB", { month: "short" });
  const y = d.getFullYear();
  return `${day}${ord} ${mon} ${y}`;
}
