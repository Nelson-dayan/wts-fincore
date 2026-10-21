"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import {
  Building2,
  ChevronDown,
  Check,
  Layers,
  Network,
  ShieldCheck,
  Lock,
  AlertCircle,
  Loader2,
  X,
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
} from "lucide-react";
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
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);
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
  const [showPassword, setShowPassword] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!pendingCompany) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !verifying) {
        setPendingCompany(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pendingCompany, verifying]);

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
    setShowPassword(false);
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
        const errorMsg =
          data.error?.message ||
          (typeof data.error === "string" ? data.error : null) ||
          data.message ||
          "Password verification failed. Please check your credentials.";
        setVerifyError(errorMsg);
        setVerifying(false);
        return;
      }

      // Authorization & password verified successfully
      startTransition(() => {
        setActiveCompany(pendingCompany);
        localStorage.setItem("activeCompanyId", pendingCompany._id);
        setPendingCompany(null);
        window.dispatchEvent(
          new CustomEvent("companyContextChanged", {
            detail: { companyId: pendingCompany._id, scopeMode },
          })
        );
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
      {mounted && pendingCompany && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6"
          role="presentation"
        >
          {/* Backdrop with click-to-cancel */}
          <button
            type="button"
            aria-label="Cancel context switch"
            disabled={verifying}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity dark:bg-black/75 cursor-default"
            onClick={() => !verifying && setPendingCompany(null)}
          />

          {/* Modal Card */}
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="company-switch-title"
            className="relative z-10 w-full max-w-lg rounded-2xl border border-border/80 bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/60 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20 shadow-xs">
                  <ShieldCheck className="size-5.5 text-primary" />
                </div>
                <div>
                  <h3 id="company-switch-title" className="font-bold text-base text-foreground">
                    Re-Authenticate Context Switch
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Enterprise Multi-Tenant Security Verification
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !verifying && setPendingCompany(null)}
                disabled={verifying}
                aria-label="Close dialog"
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmPasswordSwitch} className="space-y-4">
              {/* Context Transition Badge */}
              <div className="rounded-xl border border-border/70 bg-muted/20 p-3.5 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="size-3.5 text-primary" />
                    Operating Scope Transition
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-semibold">
                    Multi-Tenant Guard
                  </span>
                </div>
                <div className="grid grid-cols-[1fr,auto,1fr] items-center gap-2.5">
                  <div className="flex flex-col min-w-0 rounded-xl border border-border/60 bg-background/60 p-2.5">
                    <span className="text-[10px] text-muted-foreground font-semibold uppercase">Current Entity</span>
                    <span className="font-bold text-xs text-foreground truncate mt-0.5">
                      {activeCompany?.name || "Active Workspace"}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground mt-0.5 truncate">
                      [{activeCompany?.code || "CURR"}] {activeCompany?.kind ? `• ${activeCompany.kind.toUpperCase()}` : ""}
                    </span>
                  </div>

                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/20">
                    <ArrowRight className="size-4" />
                  </div>

                  <div className="flex flex-col min-w-0 rounded-xl border border-primary/40 bg-primary/10 p-2.5 text-right">
                    <span className="text-[10px] text-primary font-bold uppercase">Target Entity</span>
                    <span className="font-bold text-xs text-primary truncate mt-0.5">
                      {pendingCompany.name}
                    </span>
                    <span className="text-[10px] font-mono text-primary/90 font-semibold mt-0.5 truncate">
                      [{pendingCompany.code}] • {pendingCompany.kind.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              {verifyError && (
                <div className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive animate-in fade-in">
                  <AlertCircle className="size-4 shrink-0 text-destructive" />
                  <span className="leading-relaxed">{verifyError}</span>
                </div>
              )}

              {/* Password field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="company-switch-password" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Lock className="size-3.5 text-primary" /> Confirm Account Password
                  </label>
                  <span className="text-[11px] text-muted-foreground">Required for authorization</span>
                </div>

                {/* Hidden username to prevent browser autofill credential selector from blocking UI */}
                <input
                  type="text"
                  name="username"
                  autoComplete="username"
                  value={session?.user?.email || ""}
                  readOnly
                  tabIndex={-1}
                  className="sr-only"
                  aria-hidden="true"
                />

                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70" />
                  <input
                    id="company-switch-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    placeholder="Enter your account password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-border/80 bg-background/60 pl-9.5 pr-10 py-2.5 text-xs font-mono placeholder:font-sans placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-background transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Password re-verification confirms your authorization before switching tenant environments and accessing sensitive company financial data.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setPendingCompany(null)}
                  disabled={verifying}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={verifying || !password.trim()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90 disabled:opacity-50 transition-all hover:scale-[1.01]"
                >
                  {verifying ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Verifying Access…</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="size-4" />
                      <span>Authorize Context Switch</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

