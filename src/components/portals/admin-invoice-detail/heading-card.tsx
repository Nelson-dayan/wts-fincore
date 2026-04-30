"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Item } from "./types";

type HeadingCardProps = {
  item: Item;
  extras: Record<string, unknown>;
  onItemChange: (next: Item) => void;
  onPatchExtra: (key: string, value: string) => void;
};

export function HeadingCard({ item, extras, onItemChange, onPatchExtra }: HeadingCardProps) {
  const taxOn = item.documentInfo.taxEnabled !== false;
  const rateRaw = item.documentInfo.taxRate;
  const taxRate = typeof rateRaw === "number" && Number.isFinite(rateRaw) ? rateRaw : 5;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">1 · Heading &amp; numbers</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="inv-type">Invoice type</Label>
            <select
              id="inv-type"
              className="flex h-10 w-full rounded-lg border border-input/90 bg-background px-3 text-sm focus-visible:ring-1 focus-visible:ring-primary outline-none transition-colors"
              value={item.invoiceType ?? "aed"}
              onChange={(e) => {
                const val = e.target.value === "usd" ? "usd" : "aed";
                // When switching, we also update tax defaults and footer labels to help the user
                const isUsd = val === "usd";
                onItemChange({
                  ...item,
                  invoiceType: val,
                  documentInfo: {
                    ...item.documentInfo,
                    // Typically export/USD invoices have 0% tax
                    taxRate: isUsd ? 0 : (item.documentInfo.taxRate ?? 5),
                    taxEnabled: isUsd ? false : (item.documentInfo.taxEnabled ?? true),
                  },
                });
                onPatchExtra("footerCurrencyLine", isUsd ? "CURRENCY IN USD" : "CURRENCY IN AED");
              }}
            >
              <option value="aed">AED Invoice (Local)</option>
              <option value="usd">USD Invoice (International)</option>
            </select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="inv-doc-title">Document title</Label>
            <Input
              id="inv-doc-title"
              value={String(item.documentInfo.title ?? "")}
              placeholder="INVOICE"
              onChange={(e) =>
                onItemChange({ ...item, documentInfo: { ...item.documentInfo, title: e.target.value } })
              }
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="inv-number">Invoice number</Label>
            <Input
              id="inv-number"
              className="font-mono text-sm"
              value={item.invoiceNumber}
              onChange={(e) => onItemChange({ ...item, invoiceNumber: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inv-date">Invoice date</Label>
            <Input
              id="inv-date"
              type="date"
              value={item.documentInfo.date ? item.documentInfo.date.slice(0, 10) : ""}
              onChange={(e) =>
                onItemChange({
                  ...item,
                  documentInfo: {
                    ...item.documentInfo,
                    date: e.target.value
                      ? new Date(`${e.target.value}T12:00:00.000Z`).toISOString()
                      : item.documentInfo.date,
                  },
                })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inv-due">Due date</Label>
            <Input
              id="inv-due"
              type="date"
              value={item.dueDate ? item.dueDate.slice(0, 10) : ""}
              onChange={(e) =>
                onItemChange({
                  ...item,
                  dueDate: e.target.value
                    ? new Date(`${e.target.value}T12:00:00`).toISOString()
                    : item.dueDate,
                })
              }
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="inv-pay-terms">Payment terms</Label>
            <Input
              id="inv-pay-terms"
              list="invoice-payment-terms-presets"
              value={String(extras.paymentTerms ?? "")}
              onChange={(e) => onPatchExtra("paymentTerms", e.target.value)}
              placeholder="e.g. 30 DAYS"
            />
            <datalist id="invoice-payment-terms-presets">
              <option value="7 DAYS" />
              <option value="15 DAYS" />
              <option value="30 DAYS" />
              <option value="45 DAYS" />
              <option value="60 DAYS" />
              <option value="Due on receipt" />
            </datalist>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inv-po-ref">PO # (shown on PDF)</Label>
            <Input
              id="inv-po-ref"
              value={String(extras.poNumberRef ?? "")}
              placeholder="Purchase order reference"
              onChange={(e) => onPatchExtra("poNumberRef", e.target.value)}
            />
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-muted/20 p-4 dark:bg-muted/10">
          <p className="text-xs font-bold uppercase tracking-wide text-foreground">Tax (VAT)</p>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-background/80 px-3 py-3 sm:min-w-52">
              <input
                id="inv-tax-apply"
                type="checkbox"
                className="border-input text-primary focus-visible:ring-ring mt-0.5 size-4 shrink-0 rounded"
                checked={taxOn}
                onChange={(e) =>
                  onItemChange({
                    ...item,
                    documentInfo: { ...item.documentInfo, taxEnabled: e.target.checked },
                  })
                }
              />
              <Label htmlFor="inv-tax-apply" className="cursor-pointer text-sm font-medium leading-tight">
                Apply tax on this invoice
              </Label>
            </div>
            <div className="min-w-0 flex-1 space-y-1.5 sm:max-w-xs">
              <Label htmlFor="inv-tax-rate">Tax rate</Label>
              <div className="relative">
                <Input
                  id="inv-tax-rate"
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  className="pr-10 tabular-nums"
                  disabled={!taxOn}
                  value={taxRate}
                  onChange={(e) => {
                    const n = Number.parseFloat(e.target.value);
                    onItemChange({
                      ...item,
                      documentInfo: {
                        ...item.documentInfo,
                        taxRate: Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0,
                      },
                    });
                  }}
                />
                <span
                  className="text-muted-foreground pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm"
                  aria-hidden
                >
                  %
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
