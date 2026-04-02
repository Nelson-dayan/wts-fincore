"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Bank } from "./types";

type AccountsFooterCardProps = {
  bankAed: Bank;
  bankUsd: Bank;
  onPatchBank: (which: "bankAed" | "bankUsd", field: keyof Bank, value: string) => void;
};

export function AccountsFooterCard({
  bankAed,
  bankUsd,
  onPatchBank,
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
      </CardContent>
    </Card>
  );
}
