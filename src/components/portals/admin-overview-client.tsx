"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowUpRight,
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
import { AdminOverviewCharts } from "@/components/portals/admin-overview-charts";
import { readResponseJson } from "@/lib/http/read-response-json";

type AdminOverviewMetrics = {
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

type AdminOverview = AdminOverviewMetrics & {
  expenseTotalAmount?: number;
  expenseByMonth?: Array<{ key: string; label: string; total: number }>;
  expenseByCategory?: Array<{ category: string; total: number }>;
  topProjectsByExpense?: Array<{ projectId: string; name: string; total: number }>;
};

type MetricKey = keyof AdminOverviewMetrics;

const metricMeta: Record<MetricKey, { label: string; icon: LucideIcon }> = {
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
  description: string;
  keys: MetricKey[];
}> = [
  {
    id: "organization",
    title: "Organization",
    description: "Team, client, project and audit coverage.",
    keys: ["users", "clients", "projects", "activityLogs"],
  },
  {
    id: "commercial",
    title: "Commercial and billing",
    description: "Pipeline and money movement across documents.",
    keys: ["quotations", "purchaseOrders", "invoices", "payments", "expenses"],
  },
];

const quickLinks: Array<{ href: string; label: string }> = [
  { href: "/admin/projects", label: "Projects" },
  { href: "/admin/quotations", label: "Quotations" },
  { href: "/admin/invoices", label: "Invoices" },
  { href: "/admin/expenses", label: "Expenses" },
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
        const payload = await readResponseJson<AdminOverview | { message?: string }>(response);
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

      <section className="mb-7 grid gap-4 md:grid-cols-3">
        <Card className="dashboard-stat-card md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Operations summary</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border/60 bg-background/65 px-3 py-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Active projects</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{formatCount(data?.projects ?? 0)}</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/65 px-3 py-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Open invoices</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{formatCount(data?.invoices ?? 0)}</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/65 px-3 py-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Payments logged</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{formatCount(data?.payments ?? 0)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="dashboard-stat-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {quickLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex items-center justify-between rounded-lg border border-border/65 bg-background/65 px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent/60"
              >
                {item.label}
                <ArrowUpRight className="size-3.5 text-muted-foreground" aria-hidden />
              </Link>
            ))}
          </CardContent>
        </Card>
      </section>

      <div className="flex flex-col gap-9 md:gap-11">
        {sections.map((section) => (
          <section key={section.id} aria-labelledby={`dash-section-${section.id}`}>
            <div className="mb-3">
              <h2 id={`dash-section-${section.id}`} className="dashboard-section-label">
                {section.title}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{section.description}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {section.keys.map((key) => {
                const meta = metricMeta[key];
                const Icon = meta.icon;
                const count = data?.[key] ?? 0;
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
                        {data != null ? formatCount(count) : "—"}
                      </p>
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        {count === 0 ? "No records right now" : "Updated from live data"}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {data &&
      data.expenseTotalAmount !== undefined &&
      data.expenseByMonth &&
      data.expenseByCategory &&
      data.topProjectsByExpense ? (
        <div className="mt-9 md:mt-11">
          <AdminOverviewCharts
            expenseTotalAmount={data.expenseTotalAmount}
            expenseByMonth={data.expenseByMonth}
            expenseByCategory={data.expenseByCategory}
            topProjectsByExpense={data.topProjectsByExpense}
            projects={data.projects}
            expenses={data.expenses}
          />
        </div>
      ) : null}
    </div>
  );
}
