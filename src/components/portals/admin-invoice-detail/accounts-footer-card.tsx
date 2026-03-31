"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Bank } from "./types";

type AccountsFooterCardProps = {
  bankAed: Bank;
  bankUsd: Bank;
  extras: Record<string, unknown>;
  onPatchBank: (which: "bankAed" | "bankUsd", field: keyof Bank, value: string) => void;
  onPatchExtra: (key: string, value: string) => void;
};

export function AccountsFooterCard({
  bankAed,
  bankUsd,
  extras,
  onPatchBank,
  onPatchExtra,
}: AccountsFooterCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">5 · AED / USD accounts &amp; footer</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        {(["bankAed", "bankUsd"] as const).map((bk) => {
          const b = bk === "bankAed" ? bankAed : bankUsd;
          const label = bk === "bankAed" ? "AED ACCOUNT DETAILS" : "USD ACCOUNT DETAILS";
          return (
            <div key={bk} className="border-border/60 space-y-2 rounded-lg border p-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-700">{label}</p>
              {(["accountName", "accountNo", "iban", "bankName", "swift"] as const).map((f) => (
                <div key={`${bk}-${f}`} className="space-y-1">
                  <Label className="text-[11px] capitalize">{f.replace(/([A-Z])/g, " $1")}</Label>
                  <Input value={String(b[f] ?? "")} onChange={(e) => onPatchBank(bk, f, e.target.value)} />
                </div>
              ))}
            </div>
          );
        })}
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Amount in words (auto on save; override here)</Label>
          <textarea value={String(extras.amountInWords ?? "")} onChange={(e) => onPatchExtra("amountInWords", e.target.value)} rows={2} className="border-border bg-background flex w-full rounded-lg border px-3 py-2 text-sm" placeholder="Leave blank to use total" />
        </div>
        <div className="space-y-1.5">
          <Label>Footer terms</Label>
          <Input value={String(extras.footerTerms ?? "")} onChange={(e) => onPatchExtra("footerTerms", e.target.value)} placeholder="TERM: …" />
        </div>
        <div className="space-y-1.5">
          <Label>Currency line</Label>
          <Input value={String(extras.footerCurrencyLine ?? "")} onChange={(e) => onPatchExtra("footerCurrencyLine", e.target.value)} placeholder="CURRENCY IN AED" />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Disclaimer</Label>
          <textarea value={String(extras.disclaimer ?? "")} onChange={(e) => onPatchExtra("disclaimer", e.target.value)} rows={2} className="border-border bg-background flex w-full rounded-lg border px-3 py-2 text-sm" />
        </div>
      </CardContent>
    </Card>
  );
}
