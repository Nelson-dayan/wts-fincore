"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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
  const showAed = extras.showBankAed !== false;
  const showUsd = extras.showBankUsd !== false;

  let activePreset = "both";
  if (showAed && !showUsd) activePreset = "aed";
  else if (!showAed && showUsd) activePreset = "usd";
  else if (!showAed && !showUsd) activePreset = "none";

  const handleSelectPreset = (preset: string) => {
    if (preset === "aed") {
      onPatchExtra("showBankAed", true);
      onPatchExtra("showBankUsd", false);
    } else if (preset === "usd") {
      onPatchExtra("showBankAed", false);
      onPatchExtra("showBankUsd", true);
    } else if (preset === "both") {
      onPatchExtra("showBankAed", true);
      onPatchExtra("showBankUsd", true);
    } else {
      onPatchExtra("showBankAed", false);
      onPatchExtra("showBankUsd", false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3 border-b border-border/45 bg-muted/10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">5 · Bank details</CardTitle>
          <div className="flex items-center gap-1 bg-muted p-1 rounded-xl border border-border/80 w-fit">
            {[
              { id: "aed", label: "1st only" },
              { id: "usd", label: "2nd only" },
              { id: "both", label: "both" },
              { id: "none", label: "none" },
            ].map((p) => (
              <Button
                key={p.id}
                type="button"
                variant={activePreset === p.id ? "default" : "ghost"}
                size="sm"
                onClick={() => handleSelectPreset(p.id)}
                className={`h-7 px-3 text-xs font-semibold rounded-lg transition-all ${
                  activePreset === p.id 
                    ? "bg-background text-foreground shadow-xs hover:bg-background" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2 pt-4">
        {(["bankAed", "bankUsd"] as const).map((bk) => {
          const b = bk === "bankAed" ? bankAed : bankUsd;
          const defaultLabel = bk === "bankAed" ? "AED ACCOUNT DETAILS" : "USD ACCOUNT DETAILS";
          const titleKey = bk === "bankAed" ? "bankAedTitle" : "bankUsdTitle";
          const showKey = bk === "bankAed" ? "showBankAed" : "showBankUsd";
          const isShown = extras[showKey] !== false; // Defaults to true
          const currentTitle = String(extras[titleKey] || defaultLabel);

          return (
            <div key={bk} className="border-border/60 space-y-2 rounded-lg border p-3">
              <div className="flex items-center justify-between border-b pb-2 mb-2">
                <div className="flex-1 mr-4">
                  <input
                    type="text"
                    value={currentTitle}
                    onChange={(e) => onPatchExtra(titleKey, e.target.value)}
                    placeholder={defaultLabel}
                    className="w-full bg-transparent border-b border-transparent hover:border-border/70 focus:border-primary focus:outline-hidden text-[11px] font-bold uppercase tracking-wide text-neutral-700 dark:text-neutral-300 py-0.5 px-1 rounded transition-all"
                  />
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
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
