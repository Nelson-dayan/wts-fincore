"use client";

import { useEffect, useState } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Briefcase,
  PieChart,
  Target,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils/cn";

type ProfitabilityItem = {
  id: string;
  name: string;
  status: string;
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

export function AdminProfitabilityClient() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100);
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/reports/profitability");
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
    return () => clearTimeout(timer);
  }, []);

  const formatBase = (n: number) => {
    return "₹" + n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const formatCompact = (n: number) => {
    if (n >= 1000000) return "₹" + (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return "₹" + (n / 1000).toFixed(0) + "k";
    return "₹" + n;
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
    return <div className="p-8 text-center text-destructive font-medium border rounded-2xl bg-destructive/5">{error}</div>;
  }

  const sortedItems = [...(data?.items || [])].sort((a, b) => b.profit - a.profit);
  const topProfitItems = sortedItems.slice(0, 5);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-8 pb-20"
    >
      <DashboardPageHeader 
        title="Project Profitability" 
        description="Real-time financial performance tracking across all active and completed projects."
      />

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
            sub: "Burn & Fees", 
            icon: ArrowDownRight, 
            color: "red" 
          },
          { 
            label: "Net Profit", 
            value: data?.totals.profit, 
            sub: `${((data?.totals.profit || 0) / (data?.totals.revenue || 1) * 100).toFixed(1)}% Margin`, 
            icon: TrendingUp, 
            color: "emerald",
            colSpan: "md:col-span-2"
          }
        ].map((kpi, idx) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.1 }}
          >
            <Card className={cn(
              "overflow-hidden border-none shadow-lg relative h-full",
              kpi.color === "primary" ? "bg-primary text-primary-foreground" :
              kpi.color === "red" ? "bg-red-600 text-white" :
              "bg-emerald-600 text-white"
            )}>
              <div className="absolute top-0 right-0 p-4 opacity-20">
                <kpi.icon className="w-12 h-12" />
              </div>
              <CardHeader className="pb-2">
                <CardDescription className="text-[10px] uppercase font-bold tracking-widest text-white/70">{kpi.label}</CardDescription>
                <CardTitle className={cn(
                  "font-black tracking-tight",
                  kpi.colSpan ? "text-4xl" : "text-2xl"
                )}>{formatBase(kpi.value || 0)}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-[10px] font-bold uppercase tracking-wider text-white/60">
                  {kpi.sub}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts Area */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Revenue Area Chart */}
        <Card className="lg:col-span-2 border-border/60 shadow-xl overflow-hidden min-w-0">
          <CardHeader className="flex flex-row items-center justify-between pb-8">
            <div>
              <CardTitle className="text-base font-bold">Revenue vs Expenses</CardTitle>
              <CardDescription>Monthly growth trends over last 6 months</CardDescription>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest">
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-primary" /> Revenue</div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500" /> Expenses</div>
            </div>
          </CardHeader>
          <CardContent className="h-[300px] w-full relative">
            <RevenueAreaChart 
              data={data?.timeSeries || []} 
              formatCurrency={formatBase}
              xAxisKey="month"
            />
          </CardContent>
        </Card>

        {/* Top Projects Bar Chart */}
        <Card className="border-border/60 shadow-xl overflow-hidden min-w-0">
          <CardHeader>
            <CardTitle className="text-base font-bold">Top Performing Projects</CardTitle>
            <CardDescription>By net profit contribution</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] w-full relative">
            <ProjectsBarChart 
              data={topProfitItems} 
              formatCurrency={formatBase}
            />
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <Card className="border-border/60 shadow-xl overflow-hidden">
        <CardHeader className="bg-muted/10 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Individual Project Performance</CardTitle>
              <CardDescription>Profit/Loss breakdown per workstream</CardDescription>
            </div>
            <div className="p-2 bg-background border rounded-lg text-muted-foreground">
              <BarChart3 className="w-5 h-5" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 border-b">
                <tr className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                  <th className="px-6 py-4 text-left">Project</th>
                  <th className="px-6 py-4 text-right">Revenue</th>
                  <th className="px-6 py-4 text-right">Expenses</th>
                  <th className="px-6 py-4 text-right">Profit</th>
                  <th className="px-6 py-4 text-center">Margin</th>
                  <th className="px-6 py-4 text-center">Efficiency</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <AnimatePresence mode="popLayout">
                  {sortedItems.map((item, idx) => (
                    <motion.tr 
                      key={item.id} 
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="hover:bg-muted/20 transition-colors group cursor-pointer"
                      onClick={() => window.location.href = `/admin/projects/${item.id}`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase">
                            {item.name.slice(0, 2)}
                          </div>
                          <div>
                            <p className="font-bold text-foreground group-hover:text-primary transition-colors">{item.name}</p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{item.status.replace('_', ' ')}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-medium tabular-nums">
                        {formatBase(item.revenue)}
                      </td>
                      <td className="px-6 py-4 text-right text-red-500 font-medium tabular-nums">
                        {formatBase(item.totalCost)}
                      </td>
                      <td className={cn(
                        "px-6 py-4 text-right font-black tabular-nums",
                        item.profit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600"
                      )}>
                        {formatBase(item.profit)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={cn(
                          "px-2 py-1 rounded-full text-[10px] font-bold tabular-nums",
                          item.profitMargin > 30 ? "bg-emerald-500/10 text-emerald-600" : 
                          item.profitMargin > 10 ? "bg-blue-500/10 text-blue-600" : 
                          "bg-red-500/10 text-red-600"
                        )}>
                          {item.profitMargin.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center">
                          <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.max(0, Math.min(100, item.profitMargin))}%` }}
                              transition={{ duration: 1, delay: 0.5 }}
                              className={cn(
                                "h-full transition-colors",
                                item.profitMargin > 20 ? "bg-emerald-500" : "bg-primary"
                              )} 
                            />
                          </div>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
