"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, FolderKanban, Search } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";

type ProjectRow = {
  _id: string;
  name: string;
  status: "lead" | "in_progress" | "completed" | "on_hold";
  priority: "low" | "medium" | "high";
  budget?: number;
  createdAt: string;
};

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
      const payload = (await response.json()) as {
        items?: ProjectRow[];
        total?: number;
        message?: string;
      };
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

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="animate-fade-in">
      {initialClientId ? (
        <Link
          href={`/admin/clients/${initialClientId}`}
          className="group mb-6 inline-flex items-center gap-2 rounded-lg text-[0.8125rem] font-medium text-muted-foreground transition-[color,background-color] duration-200 hover:bg-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
            ? "Showing projects for this client only. Open a row to manage details."
            : "Open View to manage project details, edit, and delete safely."
        }
      />

      <Card className="mb-6 border-border/70 bg-card/90 shadow-(--shadow-premium) backdrop-blur-[2px] transition-[box-shadow,border-color] duration-200 hover:border-primary/12">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted/80 text-foreground/80 ring-1 ring-border/50 dark:bg-muted/45">
                <FolderKanban className="size-5" strokeWidth={1.75} aria-hidden />
              </span>
              <div>
                <CardTitle className="flex flex-wrap items-center gap-2 text-lg font-semibold tracking-tight sm:text-xl">
                  Project directory
                  <span className="inline-flex items-center rounded-full bg-primary/12 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-primary ring-1 ring-primary/20">
                    {total}
                  </span>
                </CardTitle>
                <CardDescription className="mt-1 text-[0.8125rem]">
                  {initialClientId
                    ? "Filtered list — scroll horizontally on small screens."
                    : "Search by name and paginate through all projects."}
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search projects by name"
              className="h-10 flex-1 sm:min-w-60"
            />
            <Button
              variant="outline"
              className="h-10 shrink-0 gap-2"
              onClick={() => {
                setPage(1);
                loadProjects(1, query);
              }}
            >
              <Search className="size-4 opacity-70" aria-hidden />
              Search
            </Button>
          </div>

          {error ? (
            <div
              className="rounded-2xl border border-destructive/35 bg-destructive/6 p-4 text-[0.8125rem] leading-relaxed text-destructive shadow-sm dark:bg-destructive/10"
              role="alert"
            >
              {error}
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border/60 shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-225 text-left text-[0.8125rem]">
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/45 dark:bg-muted/25">
                <th className="whitespace-nowrap px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Name
                </th>
                <th className="whitespace-nowrap px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Status
                </th>
                <th className="whitespace-nowrap px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Priority
                </th>
                <th className="whitespace-nowrap px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Budget
                </th>
                <th className="whitespace-nowrap px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Created
                </th>
                <th className="whitespace-nowrap px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Actions
                </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                          No projects found{initialClientId ? " for this client" : ""}.
                        </td>
                      </tr>
                    ) : (
                      items.map((project) => (
                        <tr
                          key={project._id}
                          className="bg-card/40 transition-[background-color] duration-150 hover:bg-muted/35 dark:hover:bg-muted/20"
                        >
                          <td className="px-4 py-3 align-middle font-medium text-foreground">
                            <span className="line-clamp-2">{project.name}</span>
                          </td>
                          <td className="px-4 py-3 align-middle">
                            <StatusBadge value={project.status} />
                          </td>
                          <td className="px-4 py-3 align-middle">
                            <PriorityBadge value={project.priority} />
                          </td>
                          <td className="px-4 py-3 align-middle tabular-nums text-muted-foreground">
                            {project.budget != null ? project.budget : "—"}
                          </td>
                          <td className="px-4 py-3 align-middle text-muted-foreground">
                            {new Date(project.createdAt).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 align-middle">
                            <Button size="sm" variant="outline" asChild className="transition-[box-shadow,border-color] duration-200 hover:border-primary/30 hover:bg-primary/5">
                              <Link href={`/admin/projects/${project._id}`}>View</Link>
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 rounded-xl border border-border/50 bg-muted/25 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:bg-muted/15">
            <Button
              variant="outline"
              size="sm"
              disabled={loading || page <= 1}
              className="gap-1.5"
              onClick={() => {
                const next = Math.max(1, page - 1);
                setPage(next);
                loadProjects(next, query);
              }}
            >
              <ChevronLeft className="size-4" aria-hidden />
              Previous
            </Button>
            <div className="flex items-center justify-center gap-2 text-[0.8125rem] text-muted-foreground">
              {loading ? (
                <span className="inline-flex size-2 animate-pulse rounded-full bg-primary/60" aria-hidden />
              ) : null}
              <span className="tabular-nums font-medium">
                Page {page} of {totalPages}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={loading || page >= totalPages}
              className="gap-1.5"
              onClick={() => {
                const next = Math.min(totalPages, page + 1);
                setPage(next);
                loadProjects(next, query);
              }}
            >
              Next
              <ChevronRight className="size-4" aria-hidden />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
