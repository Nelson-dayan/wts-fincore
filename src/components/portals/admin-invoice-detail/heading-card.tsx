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
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">1 · Heading &amp; numbers</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Document title (e.g. INVOICE)</Label>
          <Input
            value={String(item.documentInfo.title ?? "")}
            placeholder="INVOICE"
            onChange={(e) =>
              onItemChange({ ...item, documentInfo: { ...item.documentInfo, title: e.target.value } })
            }
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Invoice number</Label>
          <Input value={item.invoiceNumber} onChange={(e) => onItemChange({ ...item, invoiceNumber: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Invoice date</Label>
          <Input
            type="date"
            value={item.documentInfo.date ? item.documentInfo.date.slice(0, 10) : ""}
            onChange={(e) =>
              onItemChange({
                ...item,
                documentInfo: {
                  ...item.documentInfo,
                  date: e.target.value ? new Date(`${e.target.value}T12:00:00.000Z`).toISOString() : item.documentInfo.date,
                },
              })
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label>Due date</Label>
          <Input
            type="date"
            value={item.dueDate ? item.dueDate.slice(0, 10) : ""}
            onChange={(e) =>
              onItemChange({
                ...item,
                dueDate: e.target.value ? new Date(`${e.target.value}T12:00:00`).toISOString() : item.dueDate,
              })
            }
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Payment terms</Label>
          <Input
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
          <Label>PO # (print text)</Label>
          <Input value={String(extras.poNumberRef ?? "")} onChange={(e) => onPatchExtra("poNumberRef", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Tax %</Label>
          <Input
            type="number"
            min={0}
            value={item.documentInfo.taxRate ?? 5}
            onChange={(e) =>
              onItemChange({ ...item, documentInfo: { ...item.documentInfo, taxRate: Number(e.target.value) } })
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}
