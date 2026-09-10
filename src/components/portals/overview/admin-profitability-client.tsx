"use client";

import { useEffect, useState } from "react";
import { 
  TrendingUp, 
  BarChart3, 
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils/cn";
import { formatCurrency } from "@/lib/utils/formatters";
import { StatusBadge } from "@/components/ui/status-badge";

type ProfitabilityItem = {
  id: string;
  name: string;
  status: string;
  currency?: string;
  revenue: number;
  expenses: number;
  fees: number;
  totalCost: number;
  profit: number;
  profitMargin: number;
};

type TimeSeriesItem = {
  month: string;
  revenue: number;
  expenses: number;
};

type ReportData = {
  items: ProfitabilityItem[];
  totals: {
    revenue: number;
    expenses: number;
    fees: number;
    profit: number;
  };
  timeSeries: TimeSeriesItem[];
};

const RevenueAreaChart = dynamic(() => import("@/components/charts/revenue-area-chart"), { 
  ssr: false,
  loading: () => <div className="h-[300px] w-full flex items-center justify-center text-muted-foreground text-xs uppercase font-bold tracking-widest">Loading Revenue Trends...</div>
});

const ProjectsBarChart = dynamic(() => import("@/components/charts/projects-bar-chart"), { 
  ssr: false,
  loading: () => <div className="h-[300px] w-full flex items-center justify-center text-muted-foreground text-xs uppercase font-bold tracking-widest">Loading Projects...</div>
});

import { DateRangeSelector, DateRangeOption } from "@/components/dashboard/date-range-selector";

export function AdminProfitabilityClient() {
  const [range, setRange] = useState<DateRangeOption>("last_6_months");
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/reports/profitability?range=${range}`);
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.message || "Failed to load report");
        setData(payload);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load report");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [range]);

  const formatBase = (n: number) => {
    return formatCurrency(n, "AED");
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
        <Skeleton className="h-[400px] rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return <div className="p-8 text-center text-destructive font-semibold border rounded-2xl bg-destructive/10 text-xs">{error}</div>;
  }

  const sortedItems = [...(data?.items || [])].sort((a, b) => b.profit - a.profit);
  const topProfitItems = sortedItems.slice(0, 5);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 pb-12"
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <DashboardPageHeader 
          title="Project Profitability" 
          description="Real-time financial performance tracking across all active and completed projects."
        />
        <DateRangeSelector value={range} onChange={setRange} />
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[
          { 
            label: "Total Revenue", 
            value: data?.totals.revenue, 
            sub: "Gross Income", 
            icon: ArrowUpRight, 
            color: "primary" 
          },
          { 
            label: "Total Expenses", 
            value: (data?.totals.expenses || 0) + (data?.totals.fees || 0), 
            sub: "Burn & Operations", 
            icon: ArrowDownRight, 
            color: "red" 
          },
          { 
            label: "Net Profit", 
            value: data?.totals.profit, 
            sub: `${((data?.totals.profit || 0) / (data?.totals.revenue || 1) * 100).toFixed(1)}% Net Margin`, 
            icon: TrendingUp, 
            color: "emerald"
          }
        ].map((kpi, idx) => (
          <Card 
            key={kpi.label}
            className="overflow-hidden border-border/80 bg-card shadow-xs relative"
          >
            <div className="p-5 flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">{kpi.label}</p>
                <p className="text-2xl font-bold font-mono tabular-nums tracking-tight text-foreground">
                  {formatCurrency(kpi.value || 0, "AED")}
                </p>
                <p className="text-xs font-medium text-muted-foreground">{kpi.sub}</p>
              </div>
              <div className={cn(
                "flex size-10 items-center justify-center rounded-xl border",
                kpi.color === "primary" ? "bg-primary/10 text-primary border-primary/20" :
                kpi.color === "red" ? "bg-rose-500/10 text-rose-500 border-rose-500/20" :
                "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
              )}>
                <kpi.icon className="size-5" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Charts Area */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Revenue Area Chart */}
        <Card className="lg:col-span-2 border-border/80 bg-card shadow-xs overflow-hidden min-w-0">
          <CardHeader className="flex flex-row items-center justify-between pb-6 border-b border-border/60 bg-muted/20 dark:bg-muted/10">
            <div>
              <CardTitle className="text-base font-bold">Revenue vs Expenses</CardTitle>
              <CardDescription className="text-xs">Monthly growth trends over selected time period</CardDescription>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-primary" /> Revenue</div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Expenses</div>
            </div>
          </CardHeader>
          <CardContent className="h-[280px] w-full pt-4 relative">
            <RevenueAreaChart 
              data={data?.timeSeries || []} 
              formatCurrency={formatBase}
              xAxisKey="month"
            />
          </CardContent>
        </Card>

        {/* Top Projects Bar Chart */}
        <Card className="border-border/80 bg-card shadow-xs overflow-hidden min-w-0">
          <CardHeader className="border-b border-border/60 bg-muted/20 dark:bg-muted/10">
            <CardTitle className="text-base font-bold">Top Performing Projects</CardTitle>
            <CardDescription className="text-xs">By net profit contribution</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px] w-full pt-4 relative">
            <ProjectsBarChart 
              data={topProfitItems} 
              formatCurrency={formatBase}
            />
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <Card className="border-border/80 bg-card shadow-xs overflow-hidden">
        <CardHeader className="border-b border-border/60 bg-muted/20 px-6 py-4 dark:bg-muted/10">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold">Individual Project Performance</CardTitle>
              <CardDescription className="text-xs">Profit/Loss breakdown per workstream</CardDescription>
            </div>
            <div className="p-2 bg-background border border-border/80 rounded-lg text-muted-foreground">
              <BarChart3 className="size-4" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[50rem] text-left text-xs">
              <thead>
                <tr className="border-b border-border/80 bg-muted/30 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground dark:bg-muted/15">
                  <th className="px-5 py-3">Project</th>
                  <th className="px-5 py-3 text-right">Revenue</th>
                  <th className="px-5 py-3 text-right">Expenses</th>
                  <th className="px-5 py-3 text-right">Profit</th>
                  <th className="px-5 py-3 text-center">Margin</th>
                  <th className="px-5 py-3 text-center">Efficiency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {sortedItems.map((item) => (
                  <tr 
                    key={item.id} 
                    className="bg-card hover:bg-muted/30 transition-colors cursor-pointer dark:hover:bg-muted/15"
                    onClick={() => window.location.href = `/admin/projects/${item.id}`}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-xs uppercase">
                          {item.name.slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-semibold text-xs text-foreground hover:text-primary transition-colors">{item.name}</p>
                          <div className="mt-0.5">
                            <StatusBadge status={item.status} size="sm" />
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold tabular-nums text-foreground">
                      {formatCurrency(item.revenue, item.currency || "AED")}
                    </td>
                    <td className="px-5 py-3.5 text-right text-rose-500 font-mono font-bold tabular-nums">
                      {formatCurrency(item.totalCost, item.currency || "AED")}
                    </td>
                    <td className={cn(
                      "px-5 py-3.5 text-right font-mono font-bold tabular-nums",
                      item.profit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"
                    )}>
                      {formatCurrency(item.profit, item.currency || "AED")}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={cn(
                        "px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold tabular-nums border",
                        item.profitMargin > 30 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : 
                        item.profitMargin > 10 ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" : 
                        "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                      )}>
                        {item.profitMargin.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-center">
                        <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full transition-all",
                              item.profitMargin > 20 ? "bg-emerald-500" : "bg-primary"
                            )} 
                            style={{ width: `${Math.max(0, Math.min(100, item.profitMargin))}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
