"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardPageHeader } from "@/components/dashboard/page-header";

type AdminOverview = {
  users: number;
  clients: number;
  projects: number;
  quotations: number;
  purchaseOrders: number;
  invoices: number;
  payments: number;
  expenses: number;
  activityLogs: number;
};

const metricOrder: Array<{ key: keyof AdminOverview; label: string }> = [
  { key: "users", label: "Users" },
  { key: "clients", label: "Clients" },
  { key: "projects", label: "Projects" },
  { key: "quotations", label: "Quotations" },
  { key: "purchaseOrders", label: "Purchase Orders" },
  { key: "invoices", label: "Invoices" },
  { key: "payments", label: "Payments" },
  { key: "expenses", label: "Expenses" },
  { key: "activityLogs", label: "Activity Logs" },
];

export function AdminOverviewClient() {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const response = await fetch("/api/admin/overview", { cache: "no-store" });
        const payload = (await response.json()) as AdminOverview | { message?: string };
        if (!response.ok) {
          throw new Error("message" in payload ? payload.message ?? "Request failed" : "Request failed");
        }
        if (alive) setData(payload as AdminOverview);
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
        title="Dashboard"
        description="Live admin overview for users, projects, documents, and financial operations."
      />

      {error ? (
        <div
          className="mb-6 rounded-2xl border border-destructive/35 bg-destructive/[0.06] p-4 text-[0.8125rem] leading-relaxed text-destructive shadow-sm dark:bg-destructive/[0.1]"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
        {metricOrder.map((metric) => (
          <Card
            key={metric.key}
            className="group border-border/70 bg-card/85 backdrop-blur-[2px] transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-[var(--shadow-premium-lg)]"
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-[0.8125rem] font-medium uppercase tracking-wide text-muted-foreground">
                {metric.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground transition-colors duration-200 group-hover:text-primary sm:text-[2rem]">
                {data ? data[metric.key] : "-"}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
