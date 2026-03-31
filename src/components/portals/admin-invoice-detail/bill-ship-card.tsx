"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Item } from "./types";

type BillShipCardProps = {
  item: Item;
  extras: Record<string, unknown>;
  onItemChange: (next: Item) => void;
  onPatchExtra: (key: string, value: string) => void;
  onCopyBillToShip: () => void;
};

export function BillShipCard({ item, extras, onItemChange, onPatchExtra, onCopyBillToShip }: BillShipCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">3 · Bill to / Ship to</CardTitle>
          <Button type="button" size="sm" variant="secondary" onClick={onCopyBillToShip}>
            Same as Bill to
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2 border-b border-border/60 pb-3">
          <p className="text-xs font-semibold uppercase text-neutral-500">Bill to</p>
        </div>
        <div className="space-y-1.5">
          <Label>Client name</Label>
          <Input value={String(item.clientSnapshot.name ?? "")} onChange={(e) => onItemChange({ ...item, clientSnapshot: { ...item.clientSnapshot, name: e.target.value } })} />
        </div>
        <div className="space-y-1.5">
          <Label>Company</Label>
          <Input value={String(item.clientSnapshot.company ?? "")} onChange={(e) => onItemChange({ ...item, clientSnapshot: { ...item.clientSnapshot, company: e.target.value } })} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Address</Label>
          <textarea value={String(item.clientSnapshot.address ?? "")} onChange={(e) => onItemChange({ ...item, clientSnapshot: { ...item.clientSnapshot, address: e.target.value } })} rows={2} className="border-border bg-background flex w-full rounded-lg border px-3 py-2 text-sm" />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Client TRN</Label>
          <Input value={String(extras.clientTrn ?? "")} onChange={(e) => onPatchExtra("clientTrn", e.target.value)} />
        </div>
        <div className="space-y-1.5 sm:col-span-2 border-b border-border/60 pb-1 pt-2">
          <p className="text-xs font-semibold uppercase text-neutral-500">Ship to</p>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Ship to — first line (company / name)</Label>
          <Input value={String(extras.shipToCompany ?? "")} onChange={(e) => onPatchExtra("shipToCompany", e.target.value)} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Ship to address</Label>
          <textarea value={String(extras.shipToAddress ?? "")} onChange={(e) => onPatchExtra("shipToAddress", e.target.value)} rows={3} className="border-border bg-background flex w-full rounded-lg border px-3 py-2 text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label>Ship to TRN</Label>
          <Input value={String(extras.shipToTrn ?? "")} onChange={(e) => onPatchExtra("shipToTrn", e.target.value)} />
        </div>
      </CardContent>
    </Card>
  );
}
