"use client";

import { useCallback, useEffect, useState } from "react";
import { FolderOpen, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  QUOTATION_PDF_LOAD_DRAFT,
  QUOTATION_PDF_SAVES_CHANGED,
  QUOTATION_SAVED_LIST_KEY,
  readSavedPdfQuotationList,
  removeSavedPdfQuotation,
  type SavedPdfQuotationEntry,
} from "@/lib/quotation/pdf-saved-list";
import type { QuotationData } from "@/types/quotation-generator";

export type QuotationPdfSavedListCardProps = {
  /** When false, hide entirely if there are no saves (standalone page). */
  alwaysShow?: boolean;
};

export function QuotationPdfSavedListCard({ alwaysShow = false }: QuotationPdfSavedListCardProps) {
  const [items, setItems] = useState<SavedPdfQuotationEntry[]>([]);

  const refresh = useCallback(() => {
    setItems(readSavedPdfQuotationList());
  }, []);

  useEffect(() => {
    refresh();
    const onStorage = (e: StorageEvent) => {
      if (e.key === QUOTATION_SAVED_LIST_KEY || e.key === null) refresh();
    };
    const onCustom = () => refresh();
    window.addEventListener("storage", onStorage);
    window.addEventListener(QUOTATION_PDF_SAVES_CHANGED, onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(QUOTATION_PDF_SAVES_CHANGED, onCustom);
    };
  }, [refresh]);

  const loadOne = (entry: SavedPdfQuotationEntry) => {
    window.dispatchEvent(
      new CustomEvent<{ data: QuotationData }>(QUOTATION_PDF_LOAD_DRAFT, {
        detail: { data: entry.data },
      })
    );
    window.requestAnimationFrame(() => {
      document.getElementById("quotation-builder")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const deleteOne = (id: string) => {
    removeSavedPdfQuotation(id);
    refresh();
    window.dispatchEvent(new Event(QUOTATION_PDF_SAVES_CHANGED));
  };

  if (!alwaysShow && items.length === 0) return null;

  return (
    <Card className="mb-6 border-border/70 bg-card/90 shadow-(--shadow-premium) backdrop-blur-[2px]">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted/80 text-foreground/80 ring-1 ring-border/50 dark:bg-muted/45">
            <FolderOpen className="size-5" strokeWidth={1.75} aria-hidden />
          </span>
          <div className="min-w-0">
            <CardTitle className="text-base font-semibold tracking-tight sm:text-lg">
              Draft quotation PDFs
            </CardTitle>
          </div>
        </div>
      </CardHeader>
      {items.length > 0 ? (
        <CardContent>
          <div className="overflow-hidden rounded-xl border border-border/60">
            <div className="overflow-x-auto">
              <table className="w-full min-w-130 text-left text-[0.8125rem]">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/45 dark:bg-muted/25">
                    <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Label
                    </th>
                    <th className="whitespace-nowrap px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Saved
                    </th>
                    <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {items.map((row) => (
                    <tr
                      key={row.id}
                      className="bg-card/40 transition-colors hover:bg-muted/30 dark:hover:bg-muted/15"
                    >
                      <td className="max-w-70 truncate px-3 py-2.5 font-medium text-foreground">
                        {row.label}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">
                        {new Date(row.savedAt).toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button type="button" size="sm" variant="secondary" onClick={() => loadOne(row)}>
                            Open
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => deleteOne(row.id)}
                          >
                            <Trash2 className="size-4" aria-hidden />
                            Remove
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      ) : null}
    </Card>
  );
}
