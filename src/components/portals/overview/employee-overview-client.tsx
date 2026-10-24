"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ClipboardList,
  FileText,
  FolderKanban,
  Receipt,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { readResponseJson } from "@/lib/http/read-response-json";
import { Skeleton } from "@/components/ui/skeleton";

type EmployeeOverview = {
  myProjects: Array<{
    _id: string;
    name: string;
    status: string;
    priority: string;
    updatedAt: string;
  }>;
  myQuotations: Array<{
    _id: string;
    quotationNumber: string;
    status: string;
    createdAt: string;
  }>;
  myPurchaseOrders: Array<{
    _id: string;
    poNumber: string;
    status: string;
    createdAt: string;
  }>;
  myInvoices: Array<{
    _id: string;
    invoiceNumber: string;
    status: string;
    dueDate: string;
    createdAt: string;
  }>;
};

function OverviewListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-1.5">
          <Skeleton className="h-3.5 w-3/5" />
          <Skeleton className="h-2.5 w-2/5" />
        </div>
      ))}
    </div>
  );
}

export function EmployeeOverviewClient() {
  const [data, setData] = useState<EmployeeOverview | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/employee/overview", { cache: "no-store" });
        const payload = await readResponseJson<EmployeeOverview | { message?: string }>(
          response
        );
        if (!response.ok) {
          throw new Error(
            "message" in payload ? (payload.message ?? "Request failed") : "Request failed"
          );
        }
        if (alive) setData(payload as EmployeeOverview);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">
            <span>Employee Workspace</span>
            <span>•</span>
            <span className="text-emerald-500 font-bold">Live Synced</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl mt-1">
            Personal Dashboard
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Projects assigned to you, plus recent quotations, purchase orders, and invoices.
          </p>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm font-medium text-destructive">
          {error}
        </div>
      ) : null}

      {/* Top KPI Metric Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Projects */}
        <Card className="bg-card border-border/80 shadow-xs relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Assigned Projects
            </CardTitle>
            <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
              <FolderKanban className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tabular-nums text-foreground">
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                (data?.myProjects.length ?? 0).toLocaleString()
              )}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
              <span>Active Workspace Projects</span>
            </div>
          </CardContent>
        </Card>

        {/* Quotations */}
        <Card className="bg-card border-border/80 shadow-xs relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Project Quotations
            </CardTitle>
            <div className="flex size-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
              <FileText className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tabular-nums text-foreground">
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                (data?.myQuotations.length ?? 0).toLocaleString()
              )}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
              <span>Proposals & Estimates</span>
            </div>
          </CardContent>
        </Card>

        {/* Invoices */}
        <Card className="bg-card border-border/80 shadow-xs relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Client Invoices
            </CardTitle>
            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
              <Receipt className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tabular-nums text-foreground">
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                (data?.myInvoices.length ?? 0).toLocaleString()
              )}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-emerald-500 font-medium">
              <Sparkles className="size-3" />
              <span>Project Invoices</span>
            </div>
          </CardContent>
        </Card>

        {/* Purchase Orders */}
        <Card className="bg-card border-border/80 shadow-xs relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Purchase Orders
            </CardTitle>
            <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
              <ClipboardList className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tabular-nums text-foreground">
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                (data?.myPurchaseOrders.length ?? 0).toLocaleString()
              )}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-amber-500 font-medium">
              <span>Approved POs</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Panels Section */}
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-bold text-foreground">
            Assigned Work & Records
          </h2>
          <p className="text-xs text-muted-foreground">
            Quick oversight into your current assignments, quotations, invoices, and purchase orders.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {/* Projects Panel */}
          <Card className="bg-card border-border/80 shadow-xs hover:border-border transition-colors flex flex-col overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 border-b border-border/60 bg-muted/10">
              <div className="flex items-center gap-2.5">
                <div className="flex size-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
                  <FolderKanban className="size-3.5" />
                </div>
                <CardTitle className="text-sm font-bold text-foreground">My Projects</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs font-medium text-muted-foreground hover:text-foreground gap-1 group/btn"
                asChild
              >
                <Link href="/employee/projects">
                  <span>View all</span>
                  <ArrowUpRight className="size-3 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="p-4 flex-1 flex flex-col justify-between space-y-2">
              {loading ? (
                <OverviewListSkeleton />
              ) : data?.myProjects.length ? (
                <div className="space-y-2">
                  {data.myProjects.map((project) => (
                    <Link
                      key={project._id}
                      href="/employee/projects"
                      className="group/item flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 px-3.5 py-2.5 transition-all hover:bg-muted/40 hover:border-border"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-semibold text-xs text-foreground truncate group-hover/item:text-primary transition-colors">
                          {project.name}
                        </p>
                        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <span className="capitalize font-medium">{project.status}</span>
                          <span>•</span>
                          <span className="capitalize">{project.priority}</span>
                        </div>
                      </div>
                      <ChevronRight className="size-3.5 text-muted-foreground/60 shrink-0 group-hover/item:text-foreground group-hover/item:translate-x-0.5 transition-all" />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No assigned projects yet.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quotations Panel */}
          <Card className="bg-card border-border/80 shadow-xs hover:border-border transition-colors flex flex-col overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 border-b border-border/60 bg-muted/10">
              <div className="flex items-center gap-2.5">
                <div className="flex size-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                  <FileText className="size-3.5" />
                </div>
                <CardTitle className="text-sm font-bold text-foreground">My Quotations</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs font-medium text-muted-foreground hover:text-foreground gap-1 group/btn"
                asChild
              >
                <Link href="/employee/quotations">
                  <span>View all</span>
                  <ArrowUpRight className="size-3 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="p-4 flex-1 flex flex-col justify-between space-y-2">
              {loading ? (
                <OverviewListSkeleton />
              ) : data?.myQuotations.length ? (
                <div className="space-y-2">
                  {data.myQuotations.map((quotation) => (
                    <Link
                      key={quotation._id}
                      href="/employee/quotations"
                      className="group/item flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 px-3.5 py-2.5 transition-all hover:bg-muted/40 hover:border-border"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-semibold font-mono text-xs text-foreground truncate group-hover/item:text-primary transition-colors">
                          {quotation.quotationNumber}
                        </p>
                        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <span className="capitalize font-medium">{quotation.status}</span>
                        </div>
                      </div>
                      <ChevronRight className="size-3.5 text-muted-foreground/60 shrink-0 group-hover/item:text-foreground group-hover/item:translate-x-0.5 transition-all" />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No quotations on your projects yet.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Invoices Panel */}
          <Card className="bg-card border-border/80 shadow-xs hover:border-border transition-colors flex flex-col overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 border-b border-border/60 bg-muted/10">
              <div className="flex items-center gap-2.5">
                <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                  <Receipt className="size-3.5" />
                </div>
                <CardTitle className="text-sm font-bold text-foreground">My Invoices</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs font-medium text-muted-foreground hover:text-foreground gap-1 group/btn"
                asChild
              >
                <Link href="/employee/invoices">
                  <span>View all</span>
                  <ArrowUpRight className="size-3 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="p-4 flex-1 flex flex-col justify-between space-y-2">
              {loading ? (
                <OverviewListSkeleton />
              ) : data?.myInvoices.length ? (
                <div className="space-y-2">
                  {data.myInvoices.map((invoice) => (
                    <Link
                      key={invoice._id}
                      href="/employee/invoices"
                      className="group/item flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 px-3.5 py-2.5 transition-all hover:bg-muted/40 hover:border-border"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-semibold font-mono text-xs text-foreground truncate group-hover/item:text-primary transition-colors">
                          {invoice.invoiceNumber}
                        </p>
                        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <span className="capitalize font-medium">{invoice.status}</span>
                          <span>•</span>
                          <span>Due {new Date(invoice.dueDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <ChevronRight className="size-3.5 text-muted-foreground/60 shrink-0 group-hover/item:text-foreground group-hover/item:translate-x-0.5 transition-all" />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No invoices on your projects yet.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Purchase Orders Panel */}
          <Card className="bg-card border-border/80 shadow-xs hover:border-border transition-colors flex flex-col overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 border-b border-border/60 bg-muted/10">
              <div className="flex items-center gap-2.5">
                <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                  <ClipboardList className="size-3.5" />
                </div>
                <CardTitle className="text-sm font-bold text-foreground">My POs</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs font-medium text-muted-foreground hover:text-foreground gap-1 group/btn"
                asChild
              >
                <Link href="/employee/purchase-orders">
                  <span>View all</span>
                  <ArrowUpRight className="size-3 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="p-4 flex-1 flex flex-col justify-between space-y-2">
              {loading ? (
                <OverviewListSkeleton />
              ) : data?.myPurchaseOrders.length ? (
                <div className="space-y-2">
                  {data.myPurchaseOrders.map((po) => (
                    <Link
                      key={po._id}
                      href="/employee/purchase-orders"
                      className="group/item flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 px-3.5 py-2.5 transition-all hover:bg-muted/40 hover:border-border"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-semibold font-mono text-xs text-foreground truncate group-hover/item:text-primary transition-colors">
                          {po.poNumber}
                        </p>
                        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <span className="capitalize font-medium">{po.status}</span>
                        </div>
                      </div>
                      <ChevronRight className="size-3.5 text-muted-foreground/60 shrink-0 group-hover/item:text-foreground group-hover/item:translate-x-0.5 transition-all" />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No POs on your projects yet.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
