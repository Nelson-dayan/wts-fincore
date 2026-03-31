"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Item } from "./types";
import { formatAedAmount } from "./utils";

type LineItemsCardProps = {
  item: Item;
  taxLabelPreview: string;
  liveTotals: { subtotal: number; tax: number; total: number };
  wordsPreview: string;
  onPatchLine: (idx: number, partial: Partial<Item["pages"][0]["items"][0]>) => void;
  onAddLine: () => void;
  onRemoveLine: (idx: number) => void;
};

export function LineItemsCard({
  item,
  taxLabelPreview,
  liveTotals,
  wordsPreview,
  onPatchLine,
  onAddLine,
  onRemoveLine,
}: LineItemsCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">4 · Line items</CardTitle>
          <Button type="button" size="sm" variant="outline" onClick={onAddLine}>
            Add row
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="overflow-x-auto rounded-lg border border-border/80">
          <table className="w-full min-w-130 text-sm">
            <thead>
              <tr className="bg-muted/60 border-b text-left text-xs font-semibold">
                <th className="p-2 w-10">#</th>
                <th className="p-2 min-w-45">Item</th>
                <th className="p-2 min-w-30">Note (optional)</th>
                <th className="p-2 w-20 text-right">Qty</th>
                <th className="p-2 w-24 text-right">Rate</th>
                <th className="p-2 w-24 text-right">Amount</th>
                <th className="p-2 w-10" />
              </tr>
            </thead>
            <tbody>
              {(item.pages[0]?.items ?? []).map((row, idx) => {
                const amt = (Number(row.quantity) || 0) * (Number(row.price) || 0);
                return (
                  <tr key={row.number} className="border-b border-border/50 align-top">
                    <td className="text-muted-foreground p-2 tabular-nums">{row.number}</td>
                    <td className="p-1">
                      <Input className="h-9 border-0 shadow-none focus-visible:ring-1" value={row.name} onChange={(e) => onPatchLine(idx, { name: e.target.value })} placeholder="Description" />
                    </td>
                    <td className="p-1">
                      <Input className="h-9 border-0 text-xs shadow-none focus-visible:ring-1" value={row.description} onChange={(e) => onPatchLine(idx, { description: e.target.value })} />
                    </td>
                    <td className="p-1">
                      <Input className="h-9 border-0 text-right tabular-nums shadow-none focus-visible:ring-1" type="number" min={0} value={row.quantity} onChange={(e) => onPatchLine(idx, { quantity: Number(e.target.value) })} />
                    </td>
                    <td className="p-1">
                      <Input className="h-9 border-0 text-right tabular-nums shadow-none focus-visible:ring-1" type="number" min={0} step="0.01" value={row.price} onChange={(e) => onPatchLine(idx, { price: Number(e.target.value) })} />
                    </td>
                    <td className="p-2 text-right text-xs font-medium tabular-nums">{formatAedAmount(amt)}</td>
                    <td className="p-1">
                      <Button type="button" variant="ghost" size="sm" className="text-destructive h-8 px-2" onClick={() => onRemoveLine(idx)} disabled={(item.pages[0]?.items.length ?? 0) <= 1}>
                        ×
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="bg-muted/40 rounded-lg border border-border/60 p-3 text-sm">
          <div className="flex flex-wrap justify-between gap-x-8 gap-y-1">
            <span className="text-neutral-600">Subtotal</span>
            <span className="tabular-nums font-medium">AED {formatAedAmount(liveTotals.subtotal)}</span>
          </div>
          <div className="flex flex-wrap justify-between gap-x-8 gap-y-1">
            <span className="text-neutral-600">{taxLabelPreview}</span>
            <span className="tabular-nums font-medium">AED {formatAedAmount(liveTotals.tax)}</span>
          </div>
          <div className="mt-1 flex flex-wrap justify-between gap-x-8 gap-y-1 border-t border-border/60 pt-2 font-semibold">
            <span>Total / Balance due</span>
            <span className="tabular-nums">AED {formatAedAmount(liveTotals.total)}</span>
          </div>
          <p className="text-muted-foreground mt-2 border-t border-border/40 pt-2 text-center text-xs italic leading-snug">{wordsPreview}</p>
        </div>
      </CardContent>
    </Card>
  );
}
