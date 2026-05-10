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
  TrendingUp,
} from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { readResponseJson } from "@/lib/http/read-response-json";
import { cn } from "@/lib/utils/cn";

type ProjectRow = {
  _id: string;
  name: string;
  status: "lead" | "in_progress" | "completed" | "on_hold";
  priority: "low" | "medium" | "high";
  budget?: number;
  revenue: number;
  cost: number;
  profit: number;
  profitMargin: number;
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
  let cls = "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset";
  if (v.includes("completed") || v.includes("complete")) {
    cls += " bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-400";
  } else if (v.includes("progress")) {
    cls += " bg-blue-500/10 text-blue-700 ring-blue-500/25 dark:text-blue-400";
  } else if (v.includes("hold")) {
    cls += " bg-slate-500/10 text-slate-700 ring-slate-500/20 dark:text-slate-300";
  } else if (v.includes("lead")) {
    cls += " bg-amber-500/10 text-amber-700 ring-amber-500/25 dark:text-amber-400";
  } else {
    cls += " bg-muted text-muted-foreground ring-border/60";
  }
  return <span className={cls}>{value.replace(/_/g, " ")}</span>;
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
      const response = await fetch(`/api/admin/projects?${qs.toString()}`, { cache: "no-store" });
      const payload = await readResponseJson<{ items?: ProjectRow[]; total?: number; message?: string }>(response);
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
  }, [initialClientId]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const end = Math.min(page * limit, total);
  const start = total === 0 ? 0 : (page - 1) * limit + 1;

  const formatPrice = (n: number) => {
    return "₹" + n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  };

  return (
    <div className="animate-fade-in space-y-6">
      {initialClientId && (
        <Link href={`/admin/clients/${initialClientId}`} className="group inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
          Back to client
        </Link>
      )}

      <DashboardPageHeader 
        title="Project Intelligence" 
        description="Real-time P&L tracking across your entire project pipeline." 
      />

      <Card className="overflow-hidden border-border/60 shadow-xl bg-background/50 backdrop-blur-sm">
        <CardHeader className="border-b border-border/40 pb-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20 shadow-inner">
                <FolderKanban className="size-6" />
              </div>
              <div>
                <CardTitle className="text-xl font-black tracking-tight">Active Portfolio</CardTitle>
                <CardDescription className="text-xs font-medium uppercase tracking-wider opacity-70">
                  {total} Active Workstreams
                </CardDescription>
              </div>
            </div>
            
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground opacity-50" />
                <Input 
                  value={query} 
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && loadProjects(1, query)}
                  placeholder="Filter by project..." 
                  className="h-10 w-full sm:w-64 border-border/40 pl-9 pr-4 rounded-xl text-xs font-bold" 
                />
              </div>
              <Button onClick={() => loadProjects(1, query)} className="h-10 px-6 rounded-xl font-bold">Search</Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-xs">
            <thead>
              <tr className="border-b border-border/40 bg-muted/20 font-black uppercase tracking-widest text-muted-foreground/80">
                <th className="px-6 py-4">Project</th>
                <th className="px-4 py-4 text-center">Status</th>
                <th className="px-4 py-4 text-right">Revenue</th>
                <th className="px-4 py-4 text-right">Profit</th>
                <th className="px-4 py-4 text-center">Margin</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4"><Skeleton className="h-10 w-48 rounded-xl" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-6 w-20 mx-auto rounded-full" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-6 w-24 ml-auto" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-6 w-24 ml-auto" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-6 w-16 mx-auto" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-8 w-8 ml-auto rounded-lg" /></td>
                  </tr>
                ))
              ) : items.map((project) => (
                <tr key={project._id} className="group hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-[10px] font-black text-primary ring-1 ring-primary/20">
                        {initials(project.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-foreground">{project.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">ID: {project._id.slice(-6)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <StatusBadge value={project.status} />
                  </td>
                  <td className="px-4 py-4 text-right font-black tabular-nums">
                    {formatPrice(project.revenue)}
                  </td>
                  <td className={cn(
                    "px-4 py-4 text-right font-black tabular-nums",
                    project.profit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"
                  )}>
                    {formatPrice(project.profit)}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={cn("h-full", project.profitMargin > 50 ? "bg-emerald-500" : project.profitMargin > 20 ? "bg-blue-500" : "bg-amber-500")}
                          style={{ width: `${Math.min(100, Math.max(0, project.profitMargin))}%` }}
                        />
                      </div>
                      <span className="font-bold text-[10px] tabular-nums">{project.profitMargin.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary hover:text-white transition-all" asChild>
                      <Link href={`/admin/projects/${project._id}`}>
                        <ExternalLink className="size-4" />
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {items.length > 0 && (
            <div className="flex items-center justify-between px-6 py-4 bg-muted/10 border-t border-border/40 text-[11px] font-bold text-muted-foreground">
              <p>Showing {start}-{end} of {total} Projects</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => loadProjects(page - 1)} className="h-8 rounded-lg px-4 border-border/40">Prev</Button>
                <div className="px-3 py-1.5 bg-background border rounded-lg shadow-inner">{page} / {totalPages}</div>
                <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => loadProjects(page + 1)} className="h-8 rounded-lg px-4 border-border/40">Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
