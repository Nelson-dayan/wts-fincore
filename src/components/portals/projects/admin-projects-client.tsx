"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FolderKanban,
  Search,
} from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api/client";
import { cn } from "@/lib/utils/cn";
import { formatCurrency } from "@/lib/utils/formatters";
import { StatusBadge } from "@/components/ui/status-badge";

type ProjectRow = {
  _id: string;
  name: string;
  currency?: string;
  status: "lead" | "in_progress" | "completed" | "on_hold";
  priority: "low" | "medium" | "high";
  budget?: number;
  revenue: number;
  cost: number;
  profit: number;
  profitMargin: number;
  createdAt: string;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
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
      const payload = await apiFetch<{ 
        items?: ProjectRow[]; 
        total?: number;
      }>(`/api/admin/projects?${qs.toString()}`);
      
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
  }, [initialClientId]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const end = Math.min(page * limit, total);
  const start = total === 0 ? 0 : (page - 1) * limit + 1;

  return (
    <div className="animate-fade-in space-y-6">
      {initialClientId && (
        <Link href={`/admin/clients/${initialClientId}`} className="group inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-1" />
          Back to client
        </Link>
      )}

      <DashboardPageHeader 
        title="Projects" 
        description="Real-time performance and financial analytics across your project portfolio." 
      />

      <Card className="overflow-hidden border-border/80 shadow-xs bg-card">
        <CardHeader className="border-b border-border/60 bg-muted/20 pb-5 dark:bg-muted/10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                <FolderKanban className="size-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">Active Projects</CardTitle>
                <CardDescription className="text-xs">
                  {total} projects active across current enterprise operations
                </CardDescription>
              </div>
            </div>
            
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input 
                  value={query} 
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && loadProjects(1, query)}
                  placeholder="Filter by project..." 
                  className="h-8 w-full sm:w-64 border-border/80 pl-9 pr-4 rounded-lg text-xs" 
                />
              </div>
              <Button onClick={() => loadProjects(1, query)} size="sm" className="h-8 px-4 rounded-lg text-xs font-semibold">Search</Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          {error ? (
            <div className="m-5 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-xs font-semibold text-destructive">
              {error}
            </div>
          ) : (
            <table className="w-full min-w-[50rem] text-left text-xs">
              <thead>
                <tr className="border-b border-border/80 bg-muted/30 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground dark:bg-muted/15">
                  <th className="px-5 py-3">Project</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Revenue</th>
                  <th className="px-4 py-3 text-right">Profit</th>
                  <th className="px-4 py-3 text-center">Margin</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="bg-card">
                      <td className="px-5 py-3.5"><Skeleton className="h-4 w-44 rounded-md" /></td>
                      <td className="px-4 py-3.5"><Skeleton className="h-5 w-16 mx-auto rounded-md" /></td>
                      <td className="px-4 py-3.5"><Skeleton className="h-4 w-20 ml-auto" /></td>
                      <td className="px-4 py-3.5"><Skeleton className="h-4 w-20 ml-auto" /></td>
                      <td className="px-4 py-3.5"><Skeleton className="h-4 w-12 mx-auto" /></td>
                      <td className="px-5 py-3.5"><Skeleton className="h-7 w-7 ml-auto rounded-md" /></td>
                    </tr>
                  ))
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 px-6 text-center text-xs text-muted-foreground">
                      No projects match your current filter.
                    </td>
                  </tr>
                ) : (
                  items.map((project) => (
                    <tr key={project._id} className="bg-card hover:bg-muted/30 transition-colors dark:hover:bg-muted/15">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary border border-primary/20">
                            {initials(project.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-xs text-foreground">{project.name}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">ID: {project._id.slice(-6)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <StatusBadge status={project.status} />
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold tabular-nums text-foreground">
                        {formatCurrency(project.revenue, project.currency || "AED")}
                      </td>
                      <td className={cn(
                        "px-4 py-3.5 text-right font-mono font-bold tabular-nums",
                        project.profit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"
                      )}>
                        {formatCurrency(project.profit, project.currency || "AED")}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={cn("h-full transition-all", project.profitMargin > 50 ? "bg-emerald-500" : project.profitMargin > 20 ? "bg-blue-500" : "bg-amber-500")}
                              style={{ width: `${Math.min(100, Math.max(0, project.profitMargin))}%` }}
                            />
                          </div>
                          <span className="font-mono text-xs font-semibold tabular-nums">{project.profitMargin.toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Button variant="ghost" size="sm" className="h-7.5 px-2 text-xs font-semibold gap-1 hover:bg-primary/10 hover:text-primary rounded-md" asChild>
                          <Link href={`/admin/projects/${project._id}`}>
                            <ExternalLink className="size-3.5" />
                            <span>View</span>
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {items.length > 0 && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-border/60 bg-muted/20 px-6 py-3.5 text-xs text-muted-foreground dark:bg-muted/10">
              <p className="font-mono">Showing <strong className="text-foreground">{start}</strong>–<strong className="text-foreground">{end}</strong> of <strong className="text-foreground">{total}</strong> Projects</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => loadProjects(page - 1)} className="h-7.5 px-2.5 text-xs gap-1 rounded-md">
                  <ChevronLeft className="size-3.5" />
                  Prev
                </Button>
                <span className="font-mono font-semibold px-1 text-foreground">{page} / {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => loadProjects(page + 1)} className="h-7.5 px-2.5 text-xs gap-1 rounded-md">
                  Next
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
