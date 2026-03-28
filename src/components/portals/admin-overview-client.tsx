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
    <div className="animate-[fade-in_0.4s_ease-out_both]">
      <DashboardPageHeader
        title="Dashboard"
        description="Live admin overview for users, projects, documents, and financial operations."
      />

      {error ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {metricOrder.map((metric) => (
          <Card key={metric.key}>
            <CardHeader>
              <CardTitle className="text-base">{metric.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tracking-tight">
                {data ? data[metric.key] : "-"}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
