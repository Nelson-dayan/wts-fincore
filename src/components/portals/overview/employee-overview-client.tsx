"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ClipboardList, FileText, FolderKanban, Receipt } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
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

function OverviewListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="dashboard-list-row space-y-2 py-2">
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
    <div className="animate-fade-in">
      <DashboardPageHeader
        eyebrow="Workspace"
        title="Your dashboard"
        description="Projects assigned to you, plus recent quotations, purchase orders, and invoices."
      />
      {error ? (
        <div className="mb-6 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <section className="mb-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="dashboard-stat-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Projects</CardTitle>
            <FolderKanban className="size-4 text-primary/85" aria-hidden />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-9 w-16" />
            ) : (
              <p className="text-3xl font-semibold tabular-nums">
                {(data?.myProjects.length ?? 0).toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="dashboard-stat-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Quotations</CardTitle>
            <FileText className="size-4 text-primary/85" aria-hidden />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-9 w-16" />
            ) : (
              <p className="text-3xl font-semibold tabular-nums">
                {(data?.myQuotations.length ?? 0).toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="dashboard-stat-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Invoices</CardTitle>
            <Receipt className="size-4 text-primary/85" aria-hidden />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-9 w-16" />
            ) : (
              <p className="text-3xl font-semibold tabular-nums">
                {(data?.myInvoices.length ?? 0).toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="dashboard-stat-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">POs</CardTitle>
            <ClipboardList className="size-4 text-primary/85" aria-hidden />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-9 w-16" />
            ) : (
              <p className="text-3xl font-semibold tabular-nums">
                {(data?.myPurchaseOrders.length ?? 0).toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <Card className="dashboard-panel-card">
          <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15">
                <FolderKanban className="size-4" aria-hidden />
              </span>
              <CardTitle className="text-base font-semibold">My projects</CardTitle>
            </div>
            <Button variant="ghost" size="sm" className="shrink-0 gap-1 px-2.5" asChild>
              <Link href="/employee/projects">
                View all
                <ArrowUpRight className="size-3.5 opacity-70" aria-hidden />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {loading ? (
              <OverviewListSkeleton />
            ) : data?.myProjects.length ? (
              data.myProjects.map((project) => (
                <div key={project._id} className="dashboard-list-row">
                  <p className="font-medium leading-snug text-foreground">{project.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    <span className="capitalize">{project.status}</span>
                    <span aria-hidden> · </span>
                    <span className="capitalize">{project.priority}</span>
                  </p>
                </div>
              ))
            ) : (
              <p className="py-2 text-muted-foreground">No assigned projects yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="dashboard-panel-card">
          <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15">
                <FileText className="size-4" aria-hidden />
              </span>
              <CardTitle className="text-base font-semibold">My quotations</CardTitle>
            </div>
            <Button variant="ghost" size="sm" className="shrink-0 gap-1 px-2.5" asChild>
              <Link href="/employee/quotations">
                View all
                <ArrowUpRight className="size-3.5 opacity-70" aria-hidden />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {loading ? (
              <OverviewListSkeleton />
            ) : data?.myQuotations.length ? (
              data.myQuotations.map((quotation) => (
                <div key={quotation._id} className="dashboard-list-row">
                  <p className="font-medium text-foreground">{quotation.quotationNumber}</p>
                  <p className="mt-0.5 text-xs capitalize text-muted-foreground">
                    {quotation.status}
                  </p>
                </div>
              ))
            ) : (
              <p className="py-2 text-muted-foreground">No quotations on your projects yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="dashboard-panel-card">
          <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15">
                <Receipt className="size-4" aria-hidden />
              </span>
              <CardTitle className="text-base font-semibold">My invoices</CardTitle>
            </div>
            <Button variant="ghost" size="sm" className="shrink-0 gap-1 px-2.5" asChild>
              <Link href="/employee/invoices">
                View all
                <ArrowUpRight className="size-3.5 opacity-70" aria-hidden />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {loading ? (
              <OverviewListSkeleton />
            ) : data?.myInvoices.length ? (
              data.myInvoices.map((invoice) => (
                <div key={invoice._id} className="dashboard-list-row">
                  <p className="font-medium text-foreground">{invoice.invoiceNumber}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    <span className="capitalize">{invoice.status}</span>
                    <span aria-hidden> · </span>
                    Due {new Date(invoice.dueDate).toLocaleDateString()}
                  </p>
                </div>
              ))
            ) : (
              <p className="py-2 text-muted-foreground">No invoices on your projects yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="dashboard-panel-card">
          <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15">
                <ClipboardList className="size-4" aria-hidden />
              </span>
              <CardTitle className="text-base font-semibold">My POs</CardTitle>
            </div>
            <Button variant="ghost" size="sm" className="shrink-0 gap-1 px-2.5" asChild>
              <Link href="/employee/purchase-orders">
                View all
                <ArrowUpRight className="size-3.5 opacity-70" aria-hidden />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {loading ? (
              <OverviewListSkeleton />
            ) : data?.myPurchaseOrders.length ? (
              data.myPurchaseOrders.map((po) => (
                <div key={po._id} className="dashboard-list-row">
                  <p className="font-medium text-foreground">{po.poNumber}</p>
                  <p className="mt-0.5 text-xs capitalize text-muted-foreground">{po.status}</p>
                </div>
              ))
            ) : (
              <p className="py-2 text-muted-foreground">No POs on your projects yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
