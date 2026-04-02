"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Item } from "./types";

type CompanyCardProps = {
  item: Item;
  logoErr: string;
  logoInputRef: React.RefObject<HTMLInputElement | null>;
  onItemChange: (next: Item) => void;
  onPatchExtra: (key: string, value: string) => void;
  onPickLogo: (files: FileList | null) => Promise<void>;
};

export function CompanyCard({
  item,
  logoErr,
  logoInputRef,
  onItemChange,
  onPatchExtra,
  onPickLogo,
}: CompanyCardProps) {
  const extras = item.extras as Record<string, unknown>;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">2 · Your company (issuer)</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="space-y-1.5">
          <Label>Name</Label>
          <Input value={String(item.companySnapshot.name ?? "")} onChange={(e) => onItemChange({ ...item, companySnapshot: { ...item.companySnapshot, name: e.target.value } })} />
        </div>
        <div className="space-y-1.5">
          <Label>Address</Label>
          <textarea
            value={String(item.companySnapshot.address ?? "")}
            onChange={(e) => onItemChange({ ...item, companySnapshot: { ...item.companySnapshot, address: e.target.value } })}
            rows={3}
            className="border-border bg-background flex w-full rounded-lg border px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Company TRN</Label>
          <Input value={String(extras.companyTrn ?? "")} onChange={(e) => onPatchExtra("companyTrn", e.target.value)} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/jpg,image/webp" className="sr-only" onChange={(e) => void onPickLogo(e.target.files)} />
          <Button type="button" size="sm" variant="outline" onClick={() => logoInputRef.current?.click()}>
            Replace logo image
          </Button>
          {logoErr ? <span className="text-destructive text-xs">{logoErr}</span> : null}
        </div>
      </CardContent>
    </Card>
  );
}
