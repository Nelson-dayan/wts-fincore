"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
  myInvoices: Array<{
    _id: string;
    invoiceNumber: string;
    status: string;
    dueDate: string;
    createdAt: string;
  }>;
};

export function EmployeeOverviewClient() {
  const [data, setData] = useState<EmployeeOverview | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const response = await fetch("/api/employee/overview", { cache: "no-store" });
        const payload = (await response.json()) as EmployeeOverview | { message?: string };
        if (!response.ok) {
          throw new Error(
            "message" in payload ? (payload.message ?? "Request failed") : "Request failed"
          );
        }
        if (alive) setData(payload as EmployeeOverview);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Failed to load");
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
        description="Projects you are on, plus quotations and invoices you have created—all in one place."
      />
      {error ? (
        <div className="mb-6 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="dashboard-panel-card">
          <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-3">
            <CardTitle className="text-base font-semibold">My projects</CardTitle>
            <Button variant="ghost" size="sm" className="h-8 shrink-0 gap-1 px-2 text-xs" asChild>
              <Link href="/employee/projects">
                View all
                <ArrowUpRight className="size-3.5 opacity-70" aria-hidden />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data?.myProjects.length ? (
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
            <CardTitle className="text-base font-semibold">My quotations</CardTitle>
            <Button variant="ghost" size="sm" className="h-8 shrink-0 gap-1 px-2 text-xs" asChild>
              <Link href="/employee/quotations">
                View all
                <ArrowUpRight className="size-3.5 opacity-70" aria-hidden />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data?.myQuotations.length ? (
              data.myQuotations.map((quotation) => (
                <div key={quotation._id} className="dashboard-list-row">
                  <p className="font-medium text-foreground">{quotation.quotationNumber}</p>
                  <p className="mt-0.5 text-xs capitalize text-muted-foreground">
                    {quotation.status}
                  </p>
                </div>
              ))
            ) : (
              <p className="py-2 text-muted-foreground">No quotations created yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="dashboard-panel-card">
          <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-3">
            <CardTitle className="text-base font-semibold">My invoices</CardTitle>
            <Button variant="ghost" size="sm" className="h-8 shrink-0 gap-1 px-2 text-xs" asChild>
              <Link href="/employee/invoices">
                View all
                <ArrowUpRight className="size-3.5 opacity-70" aria-hidden />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data?.myInvoices.length ? (
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
              <p className="py-2 text-muted-foreground">No invoices created yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
