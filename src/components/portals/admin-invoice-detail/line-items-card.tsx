"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { amountInWords } from "@/lib/invoice/aed-amount-words";
import type { Item } from "./types";
import { formatAedAmount } from "./utils";

type LineItemsCardProps = {
  item: Item;
  extras: Record<string, unknown>;
  taxLabelPreview: string;
  liveTotals: { subtotal: number; tax: number; total: number };
  onPatchLine: (idx: number, partial: Partial<Item["pages"][0]["items"][0]>) => void;
  onAddLine: () => void;
  onRemoveLine: (idx: number) => void;
  onPatchExtra: (key: string, value: string) => void;
};

export function LineItemsCard({
  item,
  extras,
  taxLabelPreview,
  liveTotals,
  onPatchLine,
  onAddLine,
  onRemoveLine,
  onPatchExtra,
}: LineItemsCardProps) {
  const rows = item.pages[0]?.items ?? [];
  const currency = item.currency || "AED";
  const manualWords = String(extras.amountInWords ?? "").trim();
  const computedWords = amountInWords(liveTotals.total, currency);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">4 · Line items</CardTitle>
          <Button type="button" size="sm" variant="outline" onClick={onAddLine}>
            Add line
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="overflow-x-auto rounded-xl border border-border/80 bg-muted/10 dark:bg-muted/5">
          <table className="w-full min-w-180 border-collapse text-sm">
            <thead>
              <tr className="bg-muted/70 border-b border-border/80 text-left">
                <th scope="col" className="text-muted-foreground w-11 px-2 py-2.5 text-xs font-semibold">
                  #
                </th>
                <th scope="col" className="text-muted-foreground min-w-45 px-2 py-2.5 text-xs font-semibold">
                  Description
                </th>
                <th scope="col" className="text-muted-foreground min-w-35 px-2 py-2.5 text-xs font-semibold">
                  Detail
                </th>
                <th scope="col" className="text-muted-foreground w-24 px-2 py-2.5 text-right text-xs font-semibold">
                  Qty
                </th>
                <th scope="col" className="text-muted-foreground w-28 px-2 py-2.5 text-right text-xs font-semibold">
                  Rate ({currency})
                </th>
                <th scope="col" className="text-muted-foreground w-28 px-2 py-2.5 text-right text-xs font-semibold">
                  Line total
                </th>
                <th scope="col" className="w-11 p-1" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const amt = (Number(row.quantity) || 0) * (Number(row.price) || 0);
                const zebra = idx % 2 === 0 ? "bg-background" : "bg-muted/25";
                return (
                  <tr
                    key={`${row.number}-${idx}`}
                    className={`${zebra} border-b border-border/50 transition-colors focus-within:bg-primary/4`}
                  >
                    <td className="text-muted-foreground px-2 py-2 align-middle tabular-nums">{row.number}</td>
                    <td className="p-1.5 align-top">
                      <Label htmlFor={`inv-line-${idx}-name`} className="sr-only">
                        Description row {row.number}
                      </Label>
                      <Input
                        id={`inv-line-${idx}-name`}
                        className="h-9 border-border/90 shadow-sm"
                        value={row.name}
                        onChange={(e) => onPatchLine(idx, { name: e.target.value })}
                        placeholder="Service, product, or scope"
                        title="Main line description"
                      />
                    </td>
                    <td className="p-1.5 align-top">
                      <Label htmlFor={`inv-line-${idx}-desc`} className="sr-only">
                        Optional note row {row.number}
                      </Label>
                      <Input
                        id={`inv-line-${idx}-desc`}
                        className="h-9 border-border/90 text-xs shadow-sm"
                        value={row.description}
                        onChange={(e) => onPatchLine(idx, { description: e.target.value })}
                        placeholder="SKU, phase, extra note…"
                      />
                    </td>
                    <td className="p-1.5 align-top">
                      <Label htmlFor={`inv-line-${idx}-qty`} className="sr-only">
                        Quantity row {row.number}
                      </Label>
                      <Input
                        id={`inv-line-${idx}-qty`}
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="any"
                        className="h-9 border-border/90 text-right tabular-nums shadow-sm"
                        value={row.quantity}
                        onChange={(e) => onPatchLine(idx, { quantity: Number(e.target.value) })}
                        placeholder="1"
                      />
                    </td>
                    <td className="p-1.5 align-top">
                      <Label htmlFor={`inv-line-${idx}-rate`} className="sr-only">
                        Unit rate {currency} row {row.number}
                      </Label>
                      <Input
                        id={`inv-line-${idx}-rate`}
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step={0.01}
                        className="h-9 border-border/90 text-right tabular-nums shadow-sm"
                        value={row.price}
                        onChange={(e) => onPatchLine(idx, { price: Number(e.target.value) })}
                        placeholder="0.00"
                      />
                    </td>
                    <td className="px-2 py-2 align-middle text-right">
                      <span className="text-xs font-semibold tabular-nums text-foreground" title="Quantity × rate">
                        {currency} {formatAedAmount(amt)}
                      </span>
                    </td>
                    <td className="p-1 align-middle">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive h-8 w-8 p-0"
                        onClick={() => onRemoveLine(idx)}
                        disabled={rows.length <= 1}
                        title="Remove line"
                        aria-label={`Remove line ${row.number}`}
                      >
                        ×
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="space-y-4 rounded-xl border border-border/70 bg-muted/20 p-4 dark:bg-muted/10">
          <p className="text-xs font-bold uppercase tracking-wide text-foreground">Totals</p>
          <div className="space-y-2 text-sm">
            <div className="flex flex-wrap justify-between gap-x-8 gap-y-1">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="tabular-nums font-medium text-foreground">
                {currency} {formatAedAmount(liveTotals.subtotal)}
              </span>
            </div>
            {item.documentInfo.taxEnabled !== false && (
              <div className="flex flex-wrap justify-between gap-x-8 gap-y-1">
                <span className="text-muted-foreground">{taxLabelPreview}</span>
                <span className="tabular-nums font-medium text-foreground">
                  {currency} {formatAedAmount(liveTotals.tax)}
                </span>
              </div>
            )}
            <div className="flex flex-wrap justify-between gap-x-8 gap-y-1 border-t border-border/60 pt-2 font-semibold text-foreground">
              <span>Total / Balance due</span>
              <span className="tabular-nums">{currency} {formatAedAmount(liveTotals.total)}</span>
            </div>
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/4 p-4 dark:bg-primary/7">
          <Label htmlFor="inv-amount-words" className="text-base font-semibold">
            Amount in words
          </Label>
          <textarea
            id="inv-amount-words"
            value={String(extras.amountInWords ?? "")}
            onChange={(e) => onPatchExtra("amountInWords", e.target.value)}
            rows={4}
            placeholder={computedWords}
            className="border-border bg-background placeholder:text-muted-foreground/60 focus-visible:ring-ring flex w-full resize-y rounded-lg border px-3 py-3 text-sm leading-relaxed shadow-sm focus-visible:outline-none focus-visible:ring-2"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => onPatchExtra("amountInWords", computedWords)}
            >
              Use amount for {formatAedAmount(liveTotals.total)} {currency}
            </Button>
            {manualWords ? (
              <Button type="button" size="sm" variant="ghost" onClick={() => onPatchExtra("amountInWords", "")}>
                Clear
              </Button>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
