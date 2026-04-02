"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FolderKanban,
  Loader2,
  Search,
} from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { readResponseJson } from "@/lib/http/read-response-json";

type ProjectRow = {
  _id: string;
  name: string;
  status: "lead" | "in_progress" | "completed" | "on_hold";
  priority: "low" | "medium" | "high";
  budget?: number;
  createdAt: string;
};

function s(v: string | undefined | null): string {
  return v ?? "";
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function StatusBadge({ value }: { value: string }) {
  const v = value.toLowerCase().replace(/_/g, " ");
  let cls =
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset";
  if (v.includes("completed") || v.includes("complete")) {
    cls += " bg-emerald-500/10 text-emerald-800 ring-emerald-500/20 dark:text-emerald-400";
  } else if (v.includes("progress")) {
    cls += " bg-blue-500/10 text-blue-900 ring-blue-500/25 dark:text-blue-400";
  } else if (v.includes("hold")) {
    cls += " bg-slate-500/10 text-slate-700 ring-slate-500/20 dark:text-slate-300";
  } else if (v.includes("lead")) {
    cls += " bg-amber-500/10 text-amber-900 ring-amber-500/25 dark:text-amber-400";
  } else {
    cls += " bg-muted text-muted-foreground ring-border/60";
  }
  return <span className={cls}>{value.replace(/_/g, " ")}</span>;
}

function PriorityBadge({ value }: { value: string }) {
  const v = value.toLowerCase();
  let cls =
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ring-1 ring-inset";
  if (v === "high") cls += " bg-orange-500/10 text-orange-900 ring-orange-500/25 dark:text-orange-400";
  else if (v === "low") cls += " bg-slate-500/10 text-slate-700 ring-slate-500/20 dark:text-slate-300";
  else cls += " bg-muted text-muted-foreground ring-border/60";
  return <span className={cls}>{value}</span>;
}

export function AdminProjectsClient({ initialClientId = "" }: { initialClientId?: string }) {
  const [items, setItems] = useState<ProjectRow[]>([]);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const limit = 10;

  async function loadProjects(nextPage = page, nextQuery = query) {
    setLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams({
        page: String(nextPage),
        limit: String(limit),
        q: nextQuery,
      });
      if (initialClientId) qs.set("clientId", initialClientId);
      const response = await fetch(`/api/admin/projects?${qs.toString()}`, {
        cache: "no-store",
      });
      const payload = await readResponseJson<{
        items?: ProjectRow[];
        total?: number;
        message?: string;
      }>(response);
      if (!response.ok) throw new Error(payload.message ?? "Failed to load projects");
      setItems(payload.items ?? []);
      setTotal(payload.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProjects(1, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialClientId]);

  function searchProjects(override?: string) {
    const nextQuery = override !== undefined ? override : query;
    setPage(1);
    loadProjects(1, nextQuery);
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const end = Math.min(page * limit, total);
  const start = total === 0 ? 0 : (page - 1) * limit + 1;

  return (
    <div className="animate-fade-in">
      {initialClientId ? (
        <Link
          href={`/admin/clients/${initialClientId}`}
          className="group mb-6 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
        >
          <ArrowLeft
            className="size-4 transition-transform duration-200 group-hover:-translate-x-0.5"
            aria-hidden
          />
          Back to client
        </Link>
      ) : null}

      <DashboardPageHeader
        title="Projects"
        description={
          initialClientId
            ? "Workstreams tied to this client—status, priority, and budget at a glance."
            : "Every initiative in one directory. Search, paginate, and open a project for full detail."
        }
      />

      <Card className="overflow-hidden border-border/80">
        <div className="h-1 bg-linear-to-r from-primary/70 via-primary to-primary/35" />
        <CardHeader className="border-b border-border/60 bg-muted/20 pb-5 dark:bg-muted/10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary ring-1 ring-primary/20">
                <FolderKanban className="size-5" aria-hidden />
              </span>
              <div>
                <CardTitle className="text-[1.15rem] sm:text-xl">Project pipeline</CardTitle>
                <CardDescription className="mt-1.5 max-w-lg">
                  {initialClientId
                    ? "Filtered for this client only."
                    : "Search by project name. Row opens the detail workflow."}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-border/80 bg-background/80 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
              <span className="tabular-nums text-foreground">{total}</span>
              <span>projects</span>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={s(query)}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchProjects(undefined)}
                placeholder="Search by project name…"
                className="h-11 border-border/80 bg-background/80 pl-10 pr-4"
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                className="h-11 shrink-0 rounded-xl px-5"
                onClick={() => searchProjects(undefined)}
              >
                Search
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 shrink-0 rounded-xl"
                disabled={!query.trim()}
                onClick={() => {
                  setQuery("");
                  searchProjects("");
                }}
              >
                Clear
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {error ? (
            <div
              className="m-5 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive"
              role="alert"
            >
              {error}
            </div>
          ) : loading && items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
              <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
              <p className="text-sm font-medium">Loading projects…</p>
            </div>
          ) : !loading && items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
              <span className="flex size-14 items-center justify-center rounded-2xl bg-muted/70 text-muted-foreground">
                <FolderKanban className="size-7" aria-hidden />
              </span>
              <p className="text-base font-semibold text-foreground">No projects found</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                {initialClientId
                  ? "This client has no projects yet, or nothing matches your search."
                  : "Try another search, or create a project from a client profile."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-180 text-left text-sm">
                <thead>
                  <tr className="border-b border-border/80 bg-muted/30 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground dark:bg-muted/15">
                    <th className="px-5 py-3.5 pr-3">Project</th>
                    <th className="px-0 py-3.5 pr-3">Status</th>
                    <th className="px-0 py-3.5 pr-3">Priority</th>
                    <th className="px-0 py-3.5 pr-3">Budget</th>
                    <th className="px-0 py-3.5 pr-3">Created</th>
                    <th className="px-0 py-3.5 pr-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {items.map((project) => (
                    <tr
                      key={project._id}
                      className="bg-card transition-colors hover:bg-muted/35 dark:hover:bg-muted/20"
                    >
                      <td className="px-5 py-3.5 pr-3">
                        <div className="flex items-center gap-3">
                          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-primary/20 to-primary/5 text-xs font-bold text-primary ring-1 ring-primary/15">
                            {initials(project.name)}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-foreground">{project.name}</p>
                            <p className="truncate text-xs text-muted-foreground">…{project._id.slice(-8)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-0 py-3.5 pr-3 align-middle">
                        <StatusBadge value={project.status} />
                      </td>
                      <td className="px-0 py-3.5 pr-3 align-middle">
                        <PriorityBadge value={project.priority} />
                      </td>
                      <td className="whitespace-nowrap px-0 py-3.5 pr-3 tabular-nums text-muted-foreground">
                        {project.budget != null ? project.budget : "—"}
                      </td>
                      <td className="whitespace-nowrap px-0 py-3.5 pr-3 text-muted-foreground tabular-nums">
                        {new Date(project.createdAt).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="px-0 py-3.5 pr-5 text-right">
                        <Button size="sm" variant="secondary" className="h-8 rounded-lg px-2.5" asChild>
                          <Link href={`/admin/projects/${project._id}`}>
                            <ExternalLink className="size-3.5" aria-hidden />
                            <span className="sr-only sm:not-sr-only sm:ml-1.5 sm:text-xs">Open</span>
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {items.length > 0 ? (
            <div className="flex flex-col gap-3 border-t border-border/60 bg-muted/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:bg-muted/5">
              <p className="text-xs text-muted-foreground">
                Showing{" "}
                <span className="font-medium text-foreground">
                  {start}–{end}
                </span>{" "}
                of <span className="font-medium text-foreground">{total}</span>
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-lg"
                  disabled={loading || page <= 1}
                  onClick={() => {
                    const next = Math.max(1, page - 1);
                    setPage(next);
                    loadProjects(next, query);
                  }}
                >
                  <ChevronLeft className="mr-1 size-4" aria-hidden />
                  Previous
                </Button>
                <span className="rounded-lg border border-border/80 bg-background px-3 py-1.5 text-xs font-medium tabular-nums text-muted-foreground">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-lg"
                  disabled={loading || page >= totalPages}
                  onClick={() => {
                    const next = Math.min(totalPages, page + 1);
                    setPage(next);
                    loadProjects(next, query);
                  }}
                >
                  Next
                  <ChevronRight className="ml-1 size-4" aria-hidden />
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
