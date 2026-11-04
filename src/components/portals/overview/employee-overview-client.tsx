"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ChevronRight,
  ClipboardList,
  FileText,
  FolderKanban,
  Receipt,
  Sparkles,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <div className="space-y-2.5">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-border/60 bg-muted/20 px-3.5 py-2.5 space-y-2"
        >
          <Skeleton className="h-4 w-3/5 max-w-[14rem]" />
          <Skeleton className="h-3 w-2/5 max-w-[10rem]" />
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
      {/* Top Title Header — matching Admin Overview style */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">
            <span>Workspace</span>
            <span>•</span>
            <span className="text-emerald-500 font-bold">Live Synced</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl mt-1">
            Your dashboard
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

      {/* Top KPI Metric Summary Cards — matching Admin Overview style */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card border-border/80 shadow-xs relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Projects
            </CardTitle>
            <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
              <FolderKanban className="size-4" aria-hidden />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tabular-nums text-foreground">
              {loading ? "..." : (data?.myProjects.length ?? 0).toLocaleString()}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-indigo-500 font-medium">
              <Sparkles className="size-3" />
              <span>Assigned Deliverables</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/80 shadow-xs relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Quotations
            </CardTitle>
            <div className="flex size-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
              <FileText className="size-4" aria-hidden />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tabular-nums text-foreground">
              {loading ? "..." : (data?.myQuotations.length ?? 0).toLocaleString()}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-blue-500 font-medium">
              <span>Commercial Proposals</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/80 shadow-xs relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Invoices
            </CardTitle>
            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
              <Receipt className="size-4" aria-hidden />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tabular-nums text-foreground">
              {loading ? "..." : (data?.myInvoices.length ?? 0).toLocaleString()}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-emerald-500 font-medium">
              <span>Client Invoices</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/80 shadow-xs relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              POs
            </CardTitle>
            <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
              <ClipboardList className="size-4" aria-hidden />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tabular-nums text-foreground">
              {loading ? "..." : (data?.myPurchaseOrders.length ?? 0).toLocaleString()}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
              <span>Purchase Orders</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resource Panels — matching Admin Card UI */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* My projects */}
        <Card className="border-border/80 shadow-xs bg-card overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3 border-b border-border/60">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
                <FolderKanban className="size-4" aria-hidden />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-sm font-bold truncate">My projects</CardTitle>
                <CardDescription className="text-xs truncate">
                  Projects currently assigned to you
                </CardDescription>
              </div>
            </div>
            <Link
              href="/employee/projects"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-border/60 bg-muted/20 px-3 py-1.5 text-xs font-medium text-foreground transition-all hover:bg-primary/10 hover:border-primary/40 hover:text-primary group"
            >
              <span>View all</span>
              <ArrowUpRight
                className="size-3.5 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                aria-hidden
              />
            </Link>
          </CardHeader>
          <CardContent className="pt-4 space-y-2 text-sm">
            {loading ? (
              <OverviewListSkeleton />
            ) : data?.myProjects.length ? (
              data.myProjects.map((project) => (
                <Link
                  key={project._id}
                  href={`/employee/projects/${project._id}`}
                  className="group flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 px-3.5 py-2.5 transition-all hover:border-primary/40 hover:bg-primary/5"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-xs text-foreground truncate group-hover:text-primary transition-colors">
                      {project.name}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      <span className="capitalize">{project.status}</span>
                      <span aria-hidden> · </span>
                      <span className="capitalize">{project.priority}</span>
                    </p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground group-hover:translate-x-0.5 group-hover:text-primary transition-transform" />
                </Link>
              ))
            ) : (
              <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-6 text-center">
                <p className="text-xs font-medium text-muted-foreground">
                  No assigned projects yet.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* My quotations */}
        <Card className="border-border/80 shadow-xs bg-card overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3 border-b border-border/60">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                <FileText className="size-4" aria-hidden />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-sm font-bold truncate">My quotations</CardTitle>
                <CardDescription className="text-xs truncate">
                  Commercial proposals on your projects
                </CardDescription>
              </div>
            </div>
            <Link
              href="/employee/quotations"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-border/60 bg-muted/20 px-3 py-1.5 text-xs font-medium text-foreground transition-all hover:bg-primary/10 hover:border-primary/40 hover:text-primary group"
            >
              <span>View all</span>
              <ArrowUpRight
                className="size-3.5 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                aria-hidden
              />
            </Link>
          </CardHeader>
          <CardContent className="pt-4 space-y-2 text-sm">
            {loading ? (
              <OverviewListSkeleton />
            ) : data?.myQuotations.length ? (
              data.myQuotations.map((quotation) => (
                <Link
                  key={quotation._id}
                  href={`/employee/quotations/${quotation._id}`}
                  className="group flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 px-3.5 py-2.5 transition-all hover:border-primary/40 hover:bg-primary/5"
                >
                  <div className="min-w-0">
                    <p className="font-semibold font-mono text-xs text-foreground truncate group-hover:text-primary transition-colors">
                      {quotation.quotationNumber}
                    </p>
                    <p className="mt-0.5 text-[11px] capitalize text-muted-foreground">
                      {quotation.status}
                    </p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground group-hover:translate-x-0.5 group-hover:text-primary transition-transform" />
                </Link>
              ))
            ) : (
              <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-6 text-center">
                <p className="text-xs font-medium text-muted-foreground">
                  No quotations on your projects yet.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* My invoices */}
        <Card className="border-border/80 shadow-xs bg-card overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3 border-b border-border/60">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                <Receipt className="size-4" aria-hidden />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-sm font-bold truncate">My invoices</CardTitle>
                <CardDescription className="text-xs truncate">
                  Billing & due dates on your projects
                </CardDescription>
              </div>
            </div>
            <Link
              href="/employee/invoices"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-border/60 bg-muted/20 px-3 py-1.5 text-xs font-medium text-foreground transition-all hover:bg-primary/10 hover:border-primary/40 hover:text-primary group"
            >
              <span>View all</span>
              <ArrowUpRight
                className="size-3.5 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                aria-hidden
              />
            </Link>
          </CardHeader>
          <CardContent className="pt-4 space-y-2 text-sm">
            {loading ? (
              <OverviewListSkeleton />
            ) : data?.myInvoices.length ? (
              data.myInvoices.map((invoice) => (
                <Link
                  key={invoice._id}
                  href={`/employee/invoices/${invoice._id}`}
                  className="group flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 px-3.5 py-2.5 transition-all hover:border-primary/40 hover:bg-primary/5"
                >
                  <div className="min-w-0">
                    <p className="font-semibold font-mono text-xs text-foreground truncate group-hover:text-primary transition-colors">
                      {invoice.invoiceNumber}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      <span className="capitalize">{invoice.status}</span>
                      <span aria-hidden> · </span>
                      Due {new Date(invoice.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground group-hover:translate-x-0.5 group-hover:text-primary transition-transform" />
                </Link>
              ))
            ) : (
              <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-6 text-center">
                <p className="text-xs font-medium text-muted-foreground">
                  No invoices on your projects yet.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* My POs */}
        <Card className="border-border/80 shadow-xs bg-card overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3 border-b border-border/60">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                <ClipboardList className="size-4" aria-hidden />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-sm font-bold truncate">My POs</CardTitle>
                <CardDescription className="text-xs truncate">
                  Purchase orders on your projects
                </CardDescription>
              </div>
            </div>
            <Link
              href="/employee/purchase-orders"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-border/60 bg-muted/20 px-3 py-1.5 text-xs font-medium text-foreground transition-all hover:bg-primary/10 hover:border-primary/40 hover:text-primary group"
            >
              <span>View all</span>
              <ArrowUpRight
                className="size-3.5 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                aria-hidden
              />
            </Link>
          </CardHeader>
          <CardContent className="pt-4 space-y-2 text-sm">
            {loading ? (
              <OverviewListSkeleton />
            ) : data?.myPurchaseOrders.length ? (
              data.myPurchaseOrders.map((po) => (
                <Link
                  key={po._id}
                  href={`/employee/purchase-orders/${po._id}`}
                  className="group flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 px-3.5 py-2.5 transition-all hover:border-primary/40 hover:bg-primary/5"
                >
                  <div className="min-w-0">
                    <p className="font-semibold font-mono text-xs text-foreground truncate group-hover:text-primary transition-colors">
                      {po.poNumber}
                    </p>
                    <p className="mt-0.5 text-[11px] capitalize text-muted-foreground">
                      {po.status}
                    </p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground group-hover:translate-x-0.5 group-hover:text-primary transition-transform" />
                </Link>
              ))
            ) : (
              <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-6 text-center">
                <p className="text-xs font-medium text-muted-foreground">
                  No POs on your projects yet.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
