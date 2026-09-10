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
  onPatchExtra: (key: string, value: any) => void;
  onCopyBillToShip: () => void;
};

export function BillShipCard({ item, extras, onItemChange, onPatchExtra, onCopyBillToShip }: BillShipCardProps) {
  const hideShipping = extras.hideShipping === true;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <CardTitle className="text-base">3 · Bill to &amp; Ship to</CardTitle>
            <div className="flex items-center gap-1.5 rounded-md border border-border/80 bg-muted/30 px-2.5 py-1 text-xs">
              <input
                id="hide-shipping"
                type="checkbox"
                className="border-input text-primary focus-visible:ring-ring size-3.5 shrink-0 rounded cursor-pointer"
                checked={hideShipping}
                onChange={(e) => onPatchExtra("hideShipping", e.target.checked)}
              />
              <Label htmlFor="hide-shipping" className="text-[11px] cursor-pointer font-medium text-muted-foreground select-none">
                Hide shipping section on invoice
              </Label>
            </div>
          </div>
          {!hideShipping && (
            <Button type="button" size="sm" variant="secondary" className="shrink-0" onClick={onCopyBillToShip}>
              Copy Bill to → Ship to
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className={`grid gap-6 ${hideShipping ? "lg:grid-cols-1" : "lg:grid-cols-2"}`}>
        {/* Bill to */}
        <section
          className="space-y-4 rounded-xl border border-border/70 bg-muted/15 p-4 dark:bg-muted/10"
          aria-labelledby="inv-bill-heading"
        >
          <h3 id="inv-bill-heading" className="text-xs font-bold uppercase tracking-wide text-primary">
            Bill to
          </h3>
          <div className="grid gap-3 sm:grid-cols-1">
            <div className="space-y-1.5">
              <Label htmlFor="inv-bill-contact">Attention / contact name</Label>
              <Input
                id="inv-bill-contact"
                value={String(item.clientSnapshot.name ?? "")}
                placeholder="e.g. Ahmed Khan"
                autoComplete="name"
                onChange={(e) =>
                  onItemChange({
                    ...item,
                    clientSnapshot: { ...item.clientSnapshot, name: e.target.value },
                  })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-bill-company">Company or legal name</Label>
              <Input
                id="inv-bill-company"
                value={String(item.clientSnapshot.company ?? "")}
                placeholder="e.g. ACME Trading LLC"
                autoComplete="organization"
                onChange={(e) =>
                  onItemChange({
                    ...item,
                    clientSnapshot: { ...item.clientSnapshot, company: e.target.value },
                  })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-bill-address">Billing address</Label>
              <textarea
                id="inv-bill-address"
                value={String(item.clientSnapshot.address ?? "")}
                onChange={(e) =>
                  onItemChange({
                    ...item,
                    clientSnapshot: { ...item.clientSnapshot, address: e.target.value },
                  })
                }
                rows={4}
                placeholder={
                  "Building / street\nArea or city\nEmirate / country\nP.O. Box (if any)"
                }
                className="border-border bg-background placeholder:text-muted-foreground/70 flex w-full resize-y rounded-lg border px-3 py-2.5 text-sm leading-relaxed"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-bill-trn">Client TRN (tax registration)</Label>
              <Input
                id="inv-bill-trn"
                value={String(extras.clientTrn ?? "")}
                placeholder="Optional — e.g. VAT TRN"
                onChange={(e) => onPatchExtra("clientTrn", e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* Ship to */}
        {!hideShipping && (
          <section
            className="space-y-4 rounded-xl border border-border/70 bg-muted/15 p-4 dark:bg-muted/10 animate-fade-in"
            aria-labelledby="inv-ship-heading"
          >
            <h3 id="inv-ship-heading" className="text-xs font-bold uppercase tracking-wide text-primary">
              Ship to
            </h3>
            <div className="grid gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="inv-ship-line1">Deliver to — company or site name</Label>
                <Input
                  id="inv-ship-line1"
                  value={String(extras.shipToCompany ?? "")}
                  placeholder="e.g. ACME — Dubai Warehouse"
                  onChange={(e) => onPatchExtra("shipToCompany", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inv-ship-address">Shipping / delivery address</Label>
                <textarea
                  id="inv-ship-address"
                  value={String(extras.shipToAddress ?? "")}
                  onChange={(e) => onPatchExtra("shipToAddress", e.target.value)}
                  rows={4}
                  placeholder={
                    "Building / unit\nStreet\nArea, city\nCountry"
                  }
                  className="border-border bg-background placeholder:text-muted-foreground/70 flex w-full resize-y rounded-lg border px-3 py-2.5 text-sm leading-relaxed"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inv-ship-trn">Ship-to TRN (if different)</Label>
                <Input
                  id="inv-ship-trn"
                  value={String(extras.shipToTrn ?? "")}
                  placeholder="Optional"
                  onChange={(e) => onPatchExtra("shipToTrn", e.target.value)}
                />
              </div>
            </div>
          </section>
        )}
      </CardContent>
    </Card>
  );
}
