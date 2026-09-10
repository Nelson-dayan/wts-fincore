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
  AlertCircle,
  TrendingUp,
  ArrowRight,
  DollarSign,
  TrendingDown,
  Sparkles,
  ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { apiFetch } from "@/lib/api/client";
import { cn } from "@/lib/utils/cn";
import { AdminOverviewCharts } from "./admin-overview-charts";
import { DateRangeSelector, DateRangeOption } from "@/components/dashboard/date-range-selector";
import { GroupManagementLensBanner } from "@/components/companies/group-management-lens-banner";

type Notification = {
  type: string;
  title: string;
  description: string;
  actionUrl: string;
  severity: "high" | "medium" | "low";
};

type TimeSeries = {
  month: string;
  label: string;
  revenue: number;
  expenses: number;
};

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
  revenueTotalAmount: number;
  expenseTotalAmount: number;
  profitTotalAmount: number;
  timeSeries: TimeSeries[];
  notifications: Notification[];
  expenseByMonth: Array<{ key: string; label: string; total: number }>;
  expenseByCategory: Array<{ category: string; total: number }>;
  topProjectsByExpense: Array<{ projectId: string; name: string; total: number }>;
};

const metricMeta: Record<string, { label: string; icon: LucideIcon }> = {
  users: { label: "Total System Users", icon: Users },
  clients: { label: "Active Client Accounts", icon: Building2 },
  projects: { label: "Enterprise Projects", icon: FolderKanban },
  activityLogs: { label: "System Audit Logs", icon: Activity },
  quotations: { label: "Commercial Proposals", icon: FileText },
  purchaseOrders: { label: "Purchase Orders", icon: ClipboardList },
  invoices: { label: "Client Invoices", icon: Receipt },
  payments: { label: "Settled Payments", icon: CreditCard },
  expenses: { label: "Operational Expenses", icon: Wallet },
};

const sections: Array<{
  id: string;
  title: string;
  description: string;
  keys: (keyof typeof metricMeta)[];
}> = [
  {
    id: "organization",
    title: "Organization & Directory",
    description: "User access, client accounts, project portfolios, and compliance audit logs.",
    keys: ["users", "clients", "projects", "activityLogs"],
  },
  {
    id: "commercial",
    title: "Commercial & Financial Operations",
    description: "Quotations, purchase orders, invoices, and expense distribution.",
    keys: ["quotations", "purchaseOrders", "invoices", "payments", "expenses"],
  },
];

const quickLinks: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "/admin/projects", label: "Projects Directory", icon: FolderKanban },
  { href: "/admin/quotations", label: "Quotations & Proposals", icon: FileText },
  { href: "/admin/invoices", label: "Invoices & Billing", icon: Receipt },
  { href: "/admin/expenses", label: "Operational Expenses", icon: Wallet },
];

const RevenueAreaChart = dynamic(() => import("@/components/charts/revenue-area-chart"), { 
  ssr: false,
  loading: () => (
    <div className="h-[280px] w-full flex items-center justify-center text-muted-foreground text-xs uppercase font-mono tracking-wider">
      Loading Financial Analytics...
    </div>
  )
});

function formatCount(n: number): string {
  return n.toLocaleString();
}

function formatCurrencyAmount(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "AED",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function AdminOverviewClient() {
  const [range, setRange] = useState<DateRangeOption>("last_6_months");
  const [data, setData] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const payload = await apiFetch<AdminOverview>(`/api/admin/overview?range=${range}`);
        setData(payload);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load overview data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [range]);

  const formatBase = (n: unknown) => {
    const num = typeof n === "number" ? n : Number.parseFloat(String((n as any)?.$numberDecimal ?? n ?? 0)) || 0;
    return formatCurrencyAmount(num);
  };

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-300">
      {/* Top Title & Range Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">
            <span>Executive Command Center</span>
            <span>•</span>
            <span className="text-emerald-500 font-bold">Live Synced</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl mt-1">
            Enterprise Overview
          </h1>
        </div>
        <DateRangeSelector value={range} onChange={setRange} />
      </div>

      <GroupManagementLensBanner />

      {error && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm font-medium text-destructive">
          {error}
        </div>
      )}

      {/* Top Executive KPI Metric Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Revenue */}
        <Card className="bg-card border-border/80 shadow-xs relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Revenue
            </CardTitle>
            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
              <TrendingUp className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tabular-nums text-foreground">
              {loading ? "..." : formatCurrencyAmount(data?.revenueTotalAmount ?? 0)}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-emerald-500 font-medium">
              <Sparkles className="size-3" />
              <span>Invoiced Revenue Stream</span>
            </div>
          </CardContent>
        </Card>

        {/* Total Expenses */}
        <Card className="bg-card border-border/80 shadow-xs relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Expenses
            </CardTitle>
            <div className="flex size-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-500">
              <TrendingDown className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tabular-nums text-foreground">
              {loading ? "..." : formatCurrencyAmount(data?.expenseTotalAmount ?? 0)}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
              <span>Operational & Project Costs</span>
            </div>
          </CardContent>
        </Card>

        {/* Net Profit Margin */}
        <Card className="bg-card border-border/80 shadow-xs relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Net Profit
            </CardTitle>
            <div className="flex size-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
              <DollarSign className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tabular-nums text-foreground">
              {loading ? "..." : formatCurrencyAmount(data?.profitTotalAmount ?? 0)}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-blue-500 font-medium">
              <span>Net Profit Margin</span>
            </div>
          </CardContent>
        </Card>

        {/* Active Projects */}
        <Card className="bg-card border-border/80 shadow-xs relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Active Projects
            </CardTitle>
            <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
              <FolderKanban className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tabular-nums text-foreground">
              {loading ? "..." : formatCount(data?.projects ?? 0)}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
              <span>Ongoing Deliverables</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Needs Attention Section */}
      <AnimatePresence>
        {data && data.notifications.length > 0 && (
          <motion.section 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            className="overflow-hidden"
          >
            <div className="mb-3 flex items-center gap-2 text-amber-500">
              <AlertCircle className="size-4" />
              <h2 className="text-xs font-bold uppercase tracking-wider">Operational Action Required ({data.notifications.length})</h2>
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {data.notifications.slice(0, 4).map((notif, idx) => (
                <Link key={idx} href={notif.actionUrl}>
                  <Card className={cn(
                    "group transition-all hover:border-primary/50 hover:shadow-sm border-l-4 bg-card",
                    notif.severity === "high" ? "border-l-red-500" : "border-l-amber-500"
                  )}>
                    <CardContent className="flex items-center justify-between p-3.5">
                      <div className="flex gap-3 items-center min-w-0">
                        <div className={cn(
                          "size-8 rounded-lg flex items-center justify-center shrink-0",
                          notif.severity === "high" ? "bg-red-500/10 text-red-500" : "bg-amber-500/10 text-amber-500"
                        )}>
                          <AlertCircle className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-xs text-foreground truncate">{notif.title}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{notif.description}</p>
                        </div>
                      </div>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Financial Trend Analytics & Quick Links */}
      <section className="space-y-3">
        <div>
          <h2 className="text-base font-bold text-foreground">Financial Performance & Analytics</h2>
          <p className="text-xs text-muted-foreground">Historical revenue streams versus operational expense outflow.</p>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 border-border/80 shadow-xs bg-card overflow-hidden min-w-0">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold">Profitability & Cash Flow</CardTitle>
                  <CardDescription className="text-xs">Revenue vs Expenses trend timeline</CardDescription>
                </div>
                <div className="flex items-center gap-4 text-[10px] font-mono font-bold uppercase tracking-wider">
                  <div className="flex items-center gap-1.5"><div className="size-2 rounded-full bg-primary" /> Revenue</div>
                  <div className="flex items-center gap-1.5"><div className="size-2 rounded-full bg-red-500" /> Expenses</div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="h-[280px] w-full relative">
              <RevenueAreaChart 
                data={data?.timeSeries || []} 
                formatCurrency={formatBase}
                xAxisKey="label"
              />
            </CardContent>
          </Card>

          {/* Quick Actions Shortcuts */}
          <Card className="border-border/80 shadow-xs bg-card flex flex-col justify-between p-5">
            <div>
              <CardHeader className="p-0 pb-3">
                <CardTitle className="text-sm font-bold">Quick Actions</CardTitle>
                <CardDescription className="text-xs">Direct access to core workflows</CardDescription>
              </CardHeader>
              <CardContent className="p-0 grid gap-2">
                {quickLinks.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="inline-flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 px-3.5 py-2.5 text-xs font-medium text-foreground transition-all hover:bg-primary/10 hover:border-primary/40 hover:text-primary group"
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                        <span>{item.label}</span>
                      </div>
                      <ArrowUpRight className="size-3.5 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
                    </Link>
                  );
                })}
              </CardContent>
            </div>
          </Card>
        </div>
      </section>

      {/* Expense Insights Breakdown Charts */}
      {data && (
        <AdminOverviewCharts
          expenseTotalAmount={data.expenseTotalAmount}
          expenseByMonth={data.expenseByMonth || []}
          expenseByCategory={data.expenseByCategory || []}
          topProjectsByExpense={data.topProjectsByExpense || []}
          projects={data.projects}
          expenses={data.expenses}
        />
      )}

      {/* Categorized Entity Counts */}
      <div className="space-y-6">
        {sections.map((section) => (
          <section key={section.id} aria-labelledby={`dash-section-${section.id}`}>
            <div className="mb-3">
              <h2 id={`dash-section-${section.id}`} className="text-base font-bold text-foreground">
                {section.title}
              </h2>
              <p className="text-xs text-muted-foreground">{section.description}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {section.keys.map((key) => {
                const meta = metricMeta[key];
                if (!meta) return null;
                const Icon = meta.icon;
                const count = data?.[key as keyof AdminOverview] ?? 0;
                return (
                  <Card key={key} className="bg-card border-border/80 shadow-xs hover:border-border transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4 px-4">
                      <CardTitle className="text-xs font-semibold text-muted-foreground">
                        {meta.label}
                      </CardTitle>
                      <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="size-3.5" />
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <p className="text-2xl font-bold font-mono tabular-nums text-foreground">
                        {data != null ? formatCount(Number(count)) : "—"}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {count === 0 ? "No records found" : "Active database entries"}
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
