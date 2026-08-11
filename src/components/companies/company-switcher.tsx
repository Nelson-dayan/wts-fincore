"use client";

import { useEffect, useState, useTransition } from "react";
import { Building2, ChevronDown, Check, Layers, Network, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface CompanyOption {
  _id: string;
  name: string;
  code: string;
  kind: "holding" | "operating" | "branch" | "division";
  parentCompanyId: string | null;
  baseCurrency: string;
  isPrimary?: boolean;
}

export function CompanySwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [activeCompany, setActiveCompany] = useState<CompanyOption | null>(null);
  const [scopeMode, setScopeMode] = useState<"single" | "group">("single");
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    async function loadCompanies() {
      try {
        const storedId = localStorage.getItem("activeCompanyId");
        const storedScope = (localStorage.getItem("scopeMode") as "single" | "group") || "single";
        setScopeMode(storedScope);

        const res = await fetch(`/api/admin/companies/tree?activeId=${storedId || ""}&scopeMode=${storedScope}`);
        if (!res.ok) return;

        const data = await res.json();
        setCompanies(data.companies || []);

        if (data.context?.activeCompany) {
          setActiveCompany(data.context.activeCompany);
          localStorage.setItem("activeCompanyId", data.context.activeCompany._id);
        }
      } catch (err) {
        console.error("Failed to fetch companies:", err);
      } finally {
        setLoading(false);
      }
    }

    loadCompanies();
  }, []);

  const handleSelectCompany = (comp: CompanyOption) => {
    startTransition(() => {
      setActiveCompany(comp);
      localStorage.setItem("activeCompanyId", comp._id);
      setIsOpen(false);
      // Dispatch custom event so pages can re-fetch data for new company context
      window.dispatchEvent(new CustomEvent("companyContextChanged", { detail: { companyId: comp._id, scopeMode } }));
      window.location.reload();
    });
  };

  const handleToggleScopeMode = (mode: "single" | "group") => {
    startTransition(() => {
      setScopeMode(mode);
      localStorage.setItem("scopeMode", mode);
      window.dispatchEvent(new CustomEvent("companyContextChanged", { detail: { companyId: activeCompany?._id, scopeMode: mode } }));
      window.location.reload();
    });
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
        <Building2 className="h-3.5 w-3.5 animate-pulse text-primary" />
        <span>Loading companies...</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="group flex items-center gap-2 rounded-lg border border-border/70 bg-background/80 px-3 py-1.5 text-xs font-medium transition-all hover:border-primary/50 hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
      >
        <div className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
          <Building2 className="h-3.5 w-3.5" />
        </div>
        <div className="flex flex-col text-left">
          <span className="font-semibold leading-tight text-foreground truncate max-w-[130px]">
            {activeCompany?.name || "Select Company"}
          </span>
          <span className="text-[10px] tracking-wide text-muted-foreground uppercase flex items-center gap-1">
            <span className="font-mono text-primary/90">{activeCompany?.code || "COMP"}</span>
            <span>•</span>
            <span className="capitalize">{activeCompany?.kind || "operating"}</span>
          </span>
        </div>
        <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform duration-200", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-border/80 bg-card p-2 shadow-2xl backdrop-blur-xl animate-in fade-in-50 zoom-in-95">
            {/* Header / Scope Mode Selector */}
            <div className="mb-2 border-b border-border/50 pb-2 px-1">
              <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                <span>VIEW SCOPE</span>
                <span className="flex items-center gap-1 text-primary text-[10px]">
                  <ShieldCheck className="h-3 w-3" /> Encrypted Context
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1 rounded-lg border border-border/50 bg-muted/40 p-1">
                <button
                  type="button"
                  onClick={() => handleToggleScopeMode("single")}
                  className={cn(
                    "flex items-center justify-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-all",
                    scopeMode === "single"
                      ? "bg-background text-foreground shadow-sm font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Layers className="h-3 w-3" />
                  Single Co.
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleScopeMode("group")}
                  className={cn(
                    "flex items-center justify-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-all",
                    scopeMode === "group"
                      ? "bg-background text-primary shadow-sm font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Network className="h-3 w-3" />
                  Group View
                </button>
              </div>
            </div>

            {/* List of Companies */}
            <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
              {companies.map((comp) => {
                const isSelected = activeCompany?._id === comp._id;
                const isChild = !!comp.parentCompanyId;

                return (
                  <button
                    key={comp._id}
                    type="button"
                    onClick={() => handleSelectCompany(comp)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition-all",
                      isChild && "pl-5 border-l-2 border-primary/20",
                      isSelected
                        ? "bg-primary/10 font-semibold text-primary"
                        : "hover:bg-muted/60 text-foreground"
                    )}
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="truncate">{comp.name}</span>
                        {comp.isPrimary && (
                          <span className="rounded bg-emerald-500/10 px-1 py-0.2 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">
                            Primary
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        [{comp.code}] {comp.kind.toUpperCase()} • {comp.baseCurrency}
                      </span>
                    </div>
                    {isSelected && <Check className="h-4 w-4 shrink-0 text-primary" />}
                  </button>
                );
              })}
            </div>

            <div className="mt-2 border-t border-border/50 pt-2 px-1 text-center">
              <a
                href="/admin/settings/companies"
                className="text-[11px] font-medium text-primary hover:underline"
                onClick={() => setIsOpen(false)}
              >
                + Manage Company Hierarchy
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
