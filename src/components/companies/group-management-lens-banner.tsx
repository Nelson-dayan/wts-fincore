"use client";

import { useEffect, useState } from "react";
import { Layers, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function GroupManagementLensBanner() {
  const [scopeMode, setScopeMode] = useState<"single" | "group">("single");
  const [holdingName, setHoldingName] = useState<string>("Group Structure");
  const [companyCount, setCompanyCount] = useState<number>(0);

  useEffect(() => {
    const scope = (localStorage.getItem("scopeMode") as "single" | "group") || "single";
    setScopeMode(scope);

    if (scope === "group") {
      fetch("/api/admin/companies/tree?scopeMode=group")
        .then((res) => res.json())
        .then((data) => {
          if (data.companies) {
            setCompanyCount(data.companies.length);
            const holding = data.companies.find((c: any) => c.kind === "holding" || c.isPrimary);
            if (holding) setHoldingName(holding.name);
          }
        })
        .catch((err) => console.error("Failed to load group lens info:", err));
    }
  }, []);

  if (scopeMode !== "group") return null;

  const handleSwitchToSingle = () => {
    localStorage.setItem("scopeMode", "single");
    window.location.reload();
  };

  return (
    <div className="relative mb-6 rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-500/10 via-background to-purple-500/10 p-4 shadow-sm backdrop-blur">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-foreground">◉ Group View</h3>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Viewing consolidated data across <span className="font-semibold text-foreground">{holdingName}</span> and {companyCount > 1 ? `${companyCount - 1} operating entities` : "subsidiaries"}.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={handleSwitchToSingle}
            className="h-8 gap-1.5 text-xs rounded-xl border-indigo-500/30 hover:bg-indigo-500/10"
          >
            Switch to Company
            <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
