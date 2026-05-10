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
  ArrowRight
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { readResponseJson } from "@/lib/http/read-response-json";
import { cn } from "@/lib/utils/cn";

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
};

const metricMeta: Record<string, { label: string; icon: LucideIcon }> = {
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
  keys: (keyof typeof metricMeta)[];
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch("/api/admin/overview", { cache: "no-store" });
        const payload = await readResponseJson<AdminOverview | { message?: string }>(response);
        if (!response.ok) throw new Error("message" in payload ? payload.message : "Request failed");
        setData(payload as AdminOverview);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const formatBase = (n: number) => {
    return "₹" + n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  };

  return (
    <div className="animate-fade-in space-y-9">
      <DashboardPageHeader eyebrow="Admin" title="Dashboard" />

      {error && (
        <div className="mb-6 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* 🆕 Needs Attention Section */}
      <AnimatePresence>
        {data && data.notifications.length > 0 && (
          <motion.section 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            className="overflow-hidden"
          >
            <div className="mb-3 flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertCircle className="w-3.5 h-3.5" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em]">Needs Attention</h2>
            </div>
            <div className="grid gap-3">
              {data.notifications.map((notif, idx) => (
                <Link key={idx} href={notif.actionUrl}>
                  <Card className={cn(
                    "group transition-all hover:border-primary/40 hover:shadow-md border-l-4",
                    notif.severity === "high" ? "border-l-red-500" : "border-l-amber-500"
                  )}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex gap-4 items-center">
                        <div className={cn(
                          "p-2 rounded-full",
                          notif.severity === "high" ? "bg-red-500/10 text-red-500" : "bg-amber-500/10 text-amber-500"
                        )}>
                          <AlertCircle className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-sm">{notif.title}</p>
                          <p className="text-xs text-muted-foreground">{notif.description}</p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* 🔄 Original Operations Summary Row */}
      <section className="grid gap-4 md:grid-cols-3">
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

      {/* 🆕 New Profitability Chart Section */}
      <section>
        <div className="mb-3">
          <h2 className="dashboard-section-label">Financial Performance</h2>
          <p className="mt-1 text-sm text-muted-foreground">Real-time revenue vs expense tracking.</p>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 border-border/60 shadow-xl overflow-hidden bg-background">
            <CardHeader className="pb-8">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold">Business Profitability</CardTitle>
                  <CardDescription>Revenue vs Expenses trend</CardDescription>
                </div>
                <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest">
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-primary" /> Revenue</div>
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500" /> Expenses</div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="h-[280px] w-full pr-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data?.timeSeries || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-background border border-border/60 p-3 rounded-xl shadow-2xl">
                            <p className="text-[10px] font-bold uppercase tracking-widest mb-2">{payload[0].payload.label}</p>
                            <div className="space-y-1">
                              <p className="text-xs font-bold text-primary flex justify-between gap-4">
                                <span>Revenue:</span> <span>{formatBase(payload[0].value as number)}</span>
                              </p>
                              <p className="text-xs font-bold text-red-500 flex justify-between gap-4">
                                <span>Expenses:</span> <span>{formatBase(payload[1].value as number)}</span>
                              </p>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                  <Area type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorExp)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-primary text-primary-foreground border-none shadow-xl flex flex-col justify-center p-6 text-center">
            <p className="text-[11px] uppercase font-bold tracking-[0.2em] opacity-80 mb-2">Net Profit (All Time)</p>
            <h3 className="text-4xl font-black mb-4">{formatBase(data?.profitTotalAmount || 0)}</h3>
            <div className="mt-auto pt-4 border-t border-white/20">
              <p className="text-xs font-medium opacity-80">Margin: {((data?.profitTotalAmount || 0) / (data?.revenueTotalAmount || 1) * 100).toFixed(1)}%</p>
            </div>
          </Card>
        </div>
      </section>

      {/* 🔄 Original Sections Grid */}
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
                if (!meta) return null;
                const Icon = meta.icon;
                const count = data?.[key as keyof AdminOverview] ?? 0;
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
                        {data != null ? formatCount(Number(count)) : "—"}
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
    </div>
  );
}
