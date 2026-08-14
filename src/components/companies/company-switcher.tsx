"use client";

import { useEffect, useState, useTransition } from "react";
import { Building2, ChevronDown, Check, Layers, Network, ShieldCheck, Lock, AlertCircle, Loader2, X } from "lucide-react";
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
  const [canAccessGroupView, setCanAccessGroupView] = useState(true);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Password verification modal state
  const [pendingCompany, setPendingCompany] = useState<CompanyOption | null>(null);
  const [password, setPassword] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

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

        if (data.canAccessGroupView !== undefined) {
          setCanAccessGroupView(data.canAccessGroupView);
          if (!data.canAccessGroupView && storedScope === "group") {
            setScopeMode("single");
            localStorage.setItem("scopeMode", "single");
          }
        }

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

  const handleSelectCompanyClick = (comp: CompanyOption) => {
    if (activeCompany?._id === comp._id) {
      setIsOpen(false);
      return;
    }
    // Open password confirmation modal
    setPendingCompany(comp);
    setPassword("");
    setVerifyError(null);
    setIsOpen(false);
  };

  const handleConfirmPasswordSwitch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingCompany || !password.trim()) return;

    setVerifying(true);
    setVerifyError(null);

    try {
      const res = await fetch("/api/admin/auth/verify-company-switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetCompanyId: pendingCompany._id,
          password: password.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setVerifyError(data.error || "Password verification failed");
        setVerifying(false);
        return;
      }

      // Authorization & password verified successfully
      startTransition(() => {
        setActiveCompany(pendingCompany);
        localStorage.setItem("activeCompanyId", pendingCompany._id);
        setPendingCompany(null);
        window.dispatchEvent(new CustomEvent("companyContextChanged", { detail: { companyId: pendingCompany._id, scopeMode } }));
        window.location.reload();
      });
    } catch (err) {
      console.error("Verify company switch error:", err);
      setVerifyError("Network error occurred during verification");
      setVerifying(false);
    }
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
    <>
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
                    <ShieldCheck className="h-3 w-3" /> Protected Scope
                  </span>
                </div>
                {canAccessGroupView ? (
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
                ) : (
                  <div className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-muted/40 p-2 text-[11px] text-muted-foreground">
                    <Layers className="h-3.5 w-3.5 text-primary" />
                    <span>Operating Entity Context Locked</span>
                  </div>
                )}
              </div>

              {/* Mode Specific Body */}
              {scopeMode === "single" ? (
                /* Single Co Mode */
                <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
                  <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase">
                    Select Single Entity Context
                  </div>
                  {companies.map((comp) => {
                    const isSelected = activeCompany?._id === comp._id;
                    const isChild = !!comp.parentCompanyId;

                    return (
                      <button
                        key={comp._id}
                        type="button"
                        onClick={() => handleSelectCompanyClick(comp)}
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
              ) : (
                /* Group View Mode */
                <div className="p-2 space-y-2 text-left">
                  <div className="rounded-lg border border-primary/30 bg-primary/10 p-2.5">
                    <div className="flex items-center gap-1.5 font-semibold text-xs text-primary mb-1">
                      <Network className="h-4 w-4 shrink-0" />
                      Enterprise Group Scope Active
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Consolidates data across selected Parent Group and its authorized sub-entities.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="px-1 text-[10px] font-semibold text-muted-foreground uppercase">
                      Select Group Parent Entity
                    </div>
                    {companies
                      .filter((c) => !c.parentCompanyId || c.kind === "holding" || c.isPrimary)
                      .map((comp) => {
                        const isSelected = activeCompany?._id === comp._id;
                        const subCount = companies.filter((c) => c.parentCompanyId === comp._id).length;

                        return (
                          <button
                            key={comp._id}
                            type="button"
                            onClick={() => handleSelectCompanyClick(comp)}
                            className={cn(
                              "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition-all",
                              isSelected
                                ? "bg-primary/15 border border-primary/40 font-semibold text-primary"
                                : "hover:bg-muted/60 text-foreground border border-transparent"
                            )}
                          >
                            <div className="flex flex-col min-w-0 pr-2">
                              <span className="truncate font-medium">{comp.name}</span>
                              <span className="text-[10px] text-muted-foreground">
                                Parent Group • {subCount > 0 ? `${subCount} Sub-Entities` : "Headquarter"}
                              </span>
                            </div>
                            {isSelected && <Check className="h-4 w-4 shrink-0 text-primary" />}
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}

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

      {/* Password Authorization Verification Modal */}
      {pendingCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in-50">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95">
            <button
              type="button"
              onClick={() => setPendingCompany(null)}
              className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-border pb-4 mb-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-base text-foreground">Confirm Context Switch</h3>
                <p className="text-xs text-muted-foreground">Security authentication required</p>
              </div>
            </div>

            <form onSubmit={handleConfirmPasswordSwitch} className="space-y-4">
              <div className="rounded-xl border border-border/60 bg-muted/40 p-3 text-xs space-y-1">
                <div className="text-muted-foreground font-medium">Target Company:</div>
                <div className="font-semibold text-foreground text-sm">{pendingCompany.name}</div>
                <div className="text-[11px] text-muted-foreground font-mono">
                  Code: {pendingCompany.code} | Type: {pendingCompany.kind.toUpperCase()}
                </div>
              </div>

              {verifyError && (
                <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{verifyError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Account Password</label>
                <input
                  type="password"
                  required
                  autoFocus
                  placeholder="Enter your login password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-[11px] text-muted-foreground">
                  Confirm your password to switch your active company environment safely.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPendingCompany(null)}
                  disabled={verifying}
                  className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={verifying || !password.trim()}
                  className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {verifying ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Authorize Context Switch
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

