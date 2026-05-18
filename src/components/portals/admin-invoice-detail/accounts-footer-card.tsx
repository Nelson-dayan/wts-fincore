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
  onPatchExtra: (key: string, value: any) => void;
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
        <CardTitle className="text-base">5 · Bank details</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        {(["bankAed", "bankUsd"] as const).map((bk) => {
          const b = bk === "bankAed" ? bankAed : bankUsd;
          const label = bk === "bankAed" ? "AED ACCOUNT DETAILS" : "USD ACCOUNT DETAILS";
          const showKey = bk === "bankAed" ? "showBankAed" : "showBankUsd";
          const isShown = extras[showKey] !== false; // Defaults to true

          return (
            <div key={bk} className="border-border/60 space-y-2 rounded-lg border p-3">
              <div className="flex items-center justify-between border-b pb-2 mb-2">
                <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-700">{label}</p>
                <div className="flex items-center gap-1.5">
                  <input
                    id={`show-${bk}`}
                    type="checkbox"
                    className="border-input text-primary focus-visible:ring-ring size-3.5 shrink-0 rounded cursor-pointer"
                    checked={isShown}
                    onChange={(e) => onPatchExtra(showKey, e.target.checked)}
                  />
                  <Label htmlFor={`show-${bk}`} className="text-[10px] cursor-pointer font-medium text-muted-foreground select-none">
                    Show on PDF
                  </Label>
                </div>
              </div>
              <div className={isShown ? "space-y-2" : "space-y-2 opacity-40 pointer-events-none select-none"}>
                {(["accountName", "accountNo", "iban", "bankName", "swift"] as const).map((f) => (
                  <div key={`${bk}-${f}`} className="space-y-1">
                    <Label className="text-[11px] capitalize">{f.replace(/([A-Z])/g, " $1")}</Label>
                    <Input
                      value={String(b[f] ?? "")}
                      onChange={(e) => onPatchBank(bk, f, e.target.value)}
                      disabled={!isShown}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
