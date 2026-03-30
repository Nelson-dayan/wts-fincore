"use client";

import { useEffect, useState } from "react";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
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
          throw new Error("message" in payload ? payload.message ?? "Request failed" : "Request failed");
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
        title="Your workspace"
        description="Assignments and documents created by you across active projects."
      />
      {error ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">My Projects</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data?.myProjects.length ? (
              data.myProjects.map((project) => (
                <div key={project._id} className="rounded-lg border border-border/60 p-3">
                  <p className="font-medium">{project.name}</p>
                  <p className="text-muted-foreground">
                    {project.status} · {project.priority}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">No assigned projects yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">My Quotations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data?.myQuotations.length ? (
              data.myQuotations.map((quotation) => (
                <div key={quotation._id} className="rounded-lg border border-border/60 p-3">
                  <p className="font-medium">{quotation.quotationNumber}</p>
                  <p className="text-muted-foreground">{quotation.status}</p>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">No quotations created yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">My Invoices</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data?.myInvoices.length ? (
              data.myInvoices.map((invoice) => (
                <div key={invoice._id} className="rounded-lg border border-border/60 p-3">
                  <p className="font-medium">{invoice.invoiceNumber}</p>
                  <p className="text-muted-foreground">
                    {invoice.status} · due {new Date(invoice.dueDate).toLocaleDateString()}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">No invoices created yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
