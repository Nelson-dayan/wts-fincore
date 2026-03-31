"use client";

import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Building2,
  ClipboardList,
  CreditCard,
  FileText,
  FolderKanban,
  Receipt,
  Users,
  Wallet,
} from "lucide-react";
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

const metricMeta: Record<
  keyof AdminOverview,
  { label: string; icon: LucideIcon }
> = {
  users: { label: "Users", icon: Users },
  clients: { label: "Clients", icon: Building2 },
  projects: { label: "Projects", icon: FolderKanban },
  activityLogs: { label: "Activity logs", icon: Activity },
  quotations: { label: "Quotations", icon: FileText },
  purchaseOrders: { label: "Purchase orders", icon: ClipboardList },
  invoices: { label: "Invoices", icon: Receipt },
  payments: { label: "Payments", icon: CreditCard },
  expenses: { label: "Expenses", icon: Wallet },
};

const sections: Array<{
  id: string;
  title: string;
  keys: Array<keyof AdminOverview>;
}> = [
  {
    id: "organization",
    title: "Organization",
    keys: ["users", "clients", "projects", "activityLogs"],
  },
  {
    id: "commercial",
    title: "Commercial and billing",
    keys: ["quotations", "purchaseOrders", "invoices", "payments", "expenses"],
  },
];

function formatCount(n: number): string {
  return n.toLocaleString();
}

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
          throw new Error(
            "message" in payload ? (payload.message ?? "Request failed") : "Request failed"
          );
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
      <DashboardPageHeader eyebrow="Admin" title="Dashboard" />

      {error ? (
        <div className="mb-6 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="flex flex-col gap-9 md:gap-11">
        {sections.map((section) => (
          <section key={section.id} aria-labelledby={`dash-section-${section.id}`}>
            <h2 id={`dash-section-${section.id}`} className="dashboard-section-label">
              {section.title}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {section.keys.map((key) => {
                const meta = metricMeta[key];
                const Icon = meta.icon;
                const raw = data?.[key];
                return (
                  <Card key={key} className="dashboard-stat-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-5">
                      <CardTitle className="text-[13px] font-medium text-muted-foreground">
                        {meta.label}
                      </CardTitle>
                      <span
                        className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15"
                        aria-hidden
                      >
                        <Icon className="size-4 opacity-90" strokeWidth={1.75} />
                      </span>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
                        {data != null ? formatCount(raw ?? 0) : "—"}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
