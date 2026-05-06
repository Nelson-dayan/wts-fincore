"use client";

import { useCallback, useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { readResponseJson } from "@/lib/http/read-response-json";
import { usePortalConfig } from "@/components/portals/portal-config-context";

type ProjectRow = {
  _id: string;
  name: string;
  status?: string;
};

export type ProjectConnectorDefaults = {
  projectName: string;
  clientCompany: string;
  clientName: string;
};

export type QuotationProjectConnectorProps = {
  connectedProjectId: string;
  connectedProjectName?: string;
  onConnectProject: (projectId: string) => void;
  onClearConnection?: () => void;
  defaultsLoading?: boolean;
  /**
   * When provided, show a helpful empty-state when no match is selected yet.
   * (Useful in "new quotation" flows.)
   */
  emptyHint?: string;
};

export function QuotationProjectConnector({
  connectedProjectId,
  connectedProjectName,
  onConnectProject,
  onClearConnection,
  defaultsLoading = false,
  emptyHint = "Select a project to auto-fill quotation defaults.",
}: QuotationProjectConnectorProps) {
  const { apiPrefix } = usePortalConfig();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSearch = useMemo(() => query.trim().length > 0, [query]);

  const searchProjects = useCallback(async () => {
    if (!canSearch) return;
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({
        page: "1",
        limit: "15",
        q: query.trim(),
      });
      const res = await fetch(`${apiPrefix}/projects?${qs.toString()}`, {
        cache: "no-store",
      });
      const payload = await readResponseJson<{
        items?: ProjectRow[];
        message?: string;
      }>(res);
      if (!res.ok) throw new Error(payload.message ?? "Project search failed");
      setResults((payload.items ?? []).map((p) => ({ _id: String(p._id), name: String(p.name), status: p.status })));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Project search failed");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [apiPrefix, canSearch, query]);

  return (
    <section className="rounded-xl border border-border/70 bg-card/95 p-4 shadow-(--shadow-premium) backdrop-blur-[2px]">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold">Connect a project</p>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            Search and connect to auto-fill client name and product/framework title. A project must
            be connected to save the quotation to the database.
          </p>
        </div>
        {connectedProjectId ? (
          <div className="flex items-center gap-2 text-sm">
            <span className="rounded-lg border border-border/80 bg-background/80 px-3 py-1.5 text-xs font-medium text-muted-foreground">
              Connected:{" "}
              <span className="text-foreground">
                {connectedProjectName ?? connectedProjectId}
              </span>
            </span>
            {onClearConnection ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClearConnection}
                disabled={defaultsLoading}
              >
                Change
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="grid gap-3">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void searchProjects()}
            placeholder="Search by project name…"
            className="h-11 border-border/80 bg-background/80 pl-10 pr-4"
            disabled={defaultsLoading}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            className="h-11 rounded-xl px-5"
            onClick={() => void searchProjects()}
            disabled={!canSearch || loading || defaultsLoading}
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Searching…
              </>
            ) : (
              "Search"
            )}
          </Button>
          {query.trim() ? (
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-xl"
              disabled={defaultsLoading}
              onClick={() => {
                setQuery("");
                setResults([]);
                setError(null);
              }}
            >
              Clear
            </Button>
          ) : null}
          {defaultsLoading ? (
            <span className="text-xs text-muted-foreground" role="status">
              Loading project defaults…
            </span>
          ) : null}
        </div>

        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}

        {!connectedProjectId ? (
          <p className="text-xs text-muted-foreground">{emptyHint}</p>
        ) : null}

        {results.length > 0 ? (
          <div className="max-h-56 overflow-y-auto rounded-lg border border-border/60 bg-background">
            <div className="space-y-0.5 p-2">
              {results.map((p) => (
                <div
                  key={p._id}
                  className="flex items-center justify-between gap-3 rounded-md px-2 py-2 hover:bg-muted"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="truncate text-[0.75rem] text-muted-foreground">
                      {p.status ? `Status: ${p.status}` : ""}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="shrink-0 rounded-lg"
                    disabled={defaultsLoading}
                    variant={p._id === connectedProjectId ? "secondary" : "outline"}
                    onClick={() => onConnectProject(p._id)}
                  >
                    {p._id === connectedProjectId ? "Connected" : "Connect"}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

