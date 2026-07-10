import {
  normalizeQuotationData,
  type QuotationData,
} from "@/types/quotation-generator";

export type SavedPdfQuotationEntry = {
  id: string;
  savedAt: string;
  label: string;
  data: QuotationData;
};

export const QUOTATION_SAVED_LIST_KEY = "quotation-generator-saved-list";

export const QUOTATION_PDF_SAVES_CHANGED = "quotation-pdf-saves-changed";

export const QUOTATION_PDF_LOAD_DRAFT = "quotation-pdf-load-draft";

const MAX_SAVED = 25;

function cloneForStorage(data: QuotationData): QuotationData {
  try {
    return normalizeQuotationData(JSON.parse(JSON.stringify(data)));
  } catch {
    return normalizeQuotationData({ 
      ...data, 
      pages: data.pages ? data.pages.map((p) => ({ ...p, items: p.items ? p.items.map((r) => ({ ...r })) : [] })) : [] 
    });
  }
}

export function buildSavedPdfLabel(data: QuotationData): string {
  const ref = data.refNo.trim();
  const client = data.clientName.trim();
  const parts = [ref || null, client || null].filter(Boolean);
  const base = parts.join(" · ");
  return base.slice(0, 120) || `Draft ${new Date().toLocaleString()}`;
}

export function readSavedPdfQuotationList(): SavedPdfQuotationEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(QUOTATION_SAVED_LIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: SavedPdfQuotationEntry[] = [];
    for (const row of parsed) {
      if (!row || typeof row !== "object") continue;
      const o = row as Record<string, unknown>;
      const id = String(o.id ?? "");
      const savedAt = String(o.savedAt ?? "");
      if (!id || !savedAt) continue;
      out.push({
        id,
        savedAt,
        label: String(o.label ?? "Untitled").slice(0, 200),
        data: normalizeQuotationData(o.data),
      });
    }
    return out;
  } catch {
    return [];
  }
}

export function writeSavedPdfQuotationList(entries: SavedPdfQuotationEntry[]): void {
  localStorage.setItem(QUOTATION_SAVED_LIST_KEY, JSON.stringify(entries));
}

/** Add entry at top; trims to MAX_SAVED. Returns updated list. */
export function appendSavedPdfQuotation(data: QuotationData): SavedPdfQuotationEntry[] {
  const list = readSavedPdfQuotationList();
  const entry: SavedPdfQuotationEntry = {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    savedAt: new Date().toISOString(),
    label: buildSavedPdfLabel(data),
    data: cloneForStorage(data),
  };
  const next = [entry, ...list].slice(0, MAX_SAVED);
  writeSavedPdfQuotationList(next);
  return next;
}

export function removeSavedPdfQuotation(id: string): SavedPdfQuotationEntry[] {
  const next = readSavedPdfQuotationList().filter((e) => e.id !== id);
  writeSavedPdfQuotationList(next);
  return next;
}
