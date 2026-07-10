"use client";

import { useCallback, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api/client";
import { cn } from "@/lib/utils/cn";
import { usePortalConfig } from "@/components/portals/portal-config-context";

export type InvoiceRow = { 
  _id: string; 
  invoiceNumber: string; 
  status?: string; 
  total?: number;
  companyId?: string;
  invoiceType?: "aed" | "usd";
  currency?: string;
  totalsCache?: {
    totalIntendedBase: number;
    totalReceivedBase: number;
  };
  fixCurrency?: boolean;
};

export function InvoiceSearchPicker({
  id,
  value,
  onChange,
  disabled,
  helperText,
}: {
  id: string;
  value: string;
  onChange: (invoice: InvoiceRow | null) => void;
  disabled?: boolean;
  helperText?: string;
}) {
  const { apiPrefix } = usePortalConfig();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLabel, setSelectedLabel] = useState("");

  const search = useCallback(async () => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ page: "1", limit: "20", q });
      const payload = await apiFetch<{
        items?: InvoiceRow[];
        total?: number;
      }>(`${apiPrefix}/invoices?${qs.toString()}`);

      const items = payload.items ?? [];
      setResults(
        items.map((p) => ({
          _id: String(p._id),
          invoiceNumber: String(p.invoiceNumber ?? ""),
          status: p.status,
          total: p.total,
          companyId: p.companyId,
          invoiceType: p.invoiceType,
          currency: p.currency,
          totalsCache: p.totalsCache,
          fixCurrency: p.fixCurrency,
        }))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [apiPrefix, query]);

  function pick(p: InvoiceRow) {
    onChange(p);
    setSelectedLabel(p.invoiceNumber);
    setResults([]);
    setQuery("");
    setError(null);
  }

  function clear() {
    onChange(null);
    setSelectedLabel("");
    setResults([]);
    setError(null);
  }

  const hasSelection = Boolean(value.trim());

  return (
    <div className="space-y-2 relative">
      {helperText ? (
        <p className="text-xs leading-relaxed text-muted-foreground">{helperText}</p>
      ) : null}
      {hasSelection ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/80 bg-muted/20 px-3 py-2.5 dark:bg-muted/10">
          <span className="min-w-0 flex-1 text-sm font-medium text-foreground">
            {selectedLabel || value}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            disabled={disabled}
            onClick={clear}
          >
            Change
          </Button>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch relative z-10">
            <div className="relative min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                id={id}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), void search())}
                placeholder="Type invoice number, then Search…"
                disabled={disabled}
                className="h-10 border-border/80 bg-background/80 pl-9 pr-3"
                autoComplete="off"
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              className="h-10 shrink-0 sm:w-auto"
              disabled={disabled || !query.trim() || loading}
              onClick={() => void search()}
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                "Search"
              )}
            </Button>
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          {results.length > 0 ? (
            <ul
              className="absolute left-0 right-0 top-full mt-1 z-50 max-h-48 overflow-auto rounded-xl border border-border/70 bg-card text-sm shadow-xl"
              role="listbox"
            >
              {results.map((p) => (
                <li key={p._id} className="border-b border-border/50 last:border-0">
                  <button
                    type="button"
                    disabled={disabled}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition-colors",
                      "hover:bg-muted/60 focus:bg-muted/60 focus:outline-none"
                    )}
                    onClick={() => pick(p)}
                  >
                    <span className="min-w-0 flex-1 font-medium text-foreground">{p.invoiceNumber}</span>
                    <span className="shrink-0 text-xs text-muted-foreground font-mono">
                      {String(p.currency || p.invoiceType || "AED").toUpperCase()} {p.total?.toLocaleString()}
                    </span>
                    {p.status ? (
                      <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground ml-2">
                        {p.status}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      )}
    </div>
  );
}
