"use client";

import { useEffect, useState } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Briefcase,
  PieChart,
  Target
} from "lucide-react";
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

type ReportData = {
  items: ProfitabilityItem[];
  totals: {
    revenue: number;
    expenses: number;
    fees: number;
    profit: number;
  };
};

export function AdminProfitabilityClient() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
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
  }, []);

  const formatBase = (n: number) => {
    return "₹" + n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
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

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <DashboardPageHeader 
        title="Project Profitability" 
        description="Real-time financial performance tracking across all active and completed projects."
      />

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-primary/20 bg-primary/5 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase font-bold tracking-widest">Total Revenue</CardDescription>
            <CardTitle className="text-2xl font-bold">{formatBase(data?.totals.revenue || 0)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
              <TrendingUp className="w-3 h-3" />
              <span>Gross Income</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-500/20 bg-red-500/5 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase font-bold tracking-widest text-red-500/70">Total Expenses</CardDescription>
            <CardTitle className="text-2xl font-bold text-red-600">{formatBase((data?.totals.expenses || 0) + (data?.totals.fees || 0))}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-red-500 text-xs font-bold">
              <TrendingDown className="w-3 h-3" />
              <span>Burn & Fees</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/30 bg-emerald-500/5 shadow-sm md:col-span-2">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase font-bold tracking-widest text-emerald-600/70">Net Profit (Base)</CardDescription>
            <CardTitle className="text-4xl font-black text-emerald-600 dark:text-emerald-400">
              {formatBase(data?.totals.profit || 0)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="h-2 flex-1 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500" 
                  style={{ width: `${Math.max(0, Math.min(100, ((data?.totals.profit || 0) / (data?.totals.revenue || 1)) * 100))}%` }} 
                />
              </div>
              <span className="text-xs font-bold text-emerald-600">
                {((data?.totals.profit || 0) / (data?.totals.revenue || 1) * 100).toFixed(1)}% Margin
              </span>
            </div>
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
                {sortedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/20 transition-colors group">
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
                    <td className="px-6 py-4 text-right font-medium">
                      {formatBase(item.revenue)}
                    </td>
                    <td className="px-6 py-4 text-right text-red-500 font-medium">
                      {formatBase(item.totalCost)}
                    </td>
                    <td className={cn(
                      "px-6 py-4 text-right font-black",
                      item.profit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600"
                    )}>
                      {formatBase(item.profit)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-[10px] font-bold",
                        item.profitMargin > 30 ? "bg-emerald-500/10 text-emerald-600" : 
                        item.profitMargin > 10 ? "bg-blue-500/10 text-blue-600" : 
                        "bg-red-500/10 text-red-600"
                      )}>
                        {item.profitMargin.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center">
                        <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full transition-all duration-1000",
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

      {/* Secondary Insights */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <PieChart className="w-4 h-4 text-primary" />
              Resource Allocation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-dashed">
              <span className="text-sm font-medium text-muted-foreground">Most Profitable</span>
              <span className="text-sm font-bold text-emerald-600">{sortedItems[0]?.name || "N/A"}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-dashed">
              <span className="text-sm font-medium text-muted-foreground">Highest Expenses</span>
              <span className="text-sm font-bold text-red-500">
                {[...sortedItems].sort((a,b) => b.expenses - a.expenses)[0]?.name || "N/A"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Efficiency Target
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-xl text-primary">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Average Margin</p>
                <p className="text-2xl font-black text-primary">
                  {(sortedItems.reduce((acc, curr) => acc + curr.profitMargin, 0) / (sortedItems.length || 1)).toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
