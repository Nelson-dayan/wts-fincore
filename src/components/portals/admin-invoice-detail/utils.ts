import { aedAmountInWords } from "@/lib/invoice/aed-amount-words";

export function formatAedAmount(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function previewWords(extras: Record<string, unknown>, total: number): string {
  const manualWordsPreview = String(extras.amountInWords ?? "").trim();
  return manualWordsPreview || aedAmountInWords(total);
}

export function readImageFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result ?? ""));
    r.onerror = () => reject(r.error ?? new Error("read failed"));
    r.readAsDataURL(file);
  });
}
