"use client";

import Link from "next/link";
import { FolderKanban, TrendingUp, Wallet } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DEFAULT_CURRENCY } from "@/lib/constants/finance";

function safeNumber(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "object") {
    const obj = v as any;
    if (obj.$numberDecimal != null) return Number.parseFloat(String(obj.$numberDecimal)) || 0;
    if (obj.value != null) return safeNumber(obj.value);
    if (typeof obj.toString === "function" && obj.toString !== Object.prototype.toString) {
      return Number.parseFloat(obj.toString()) || 0;
    }
  }
  return Number.parseFloat(String(v)) || 0;
}

function formatCurrency(n: unknown) {
  const num = safeNumber(n);
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function BarRow({
  label,
  value,
  max,
  accent,
}: {
  label: string;
  value: number;
  max: number;
  accent?: string;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="min-w-0 truncate font-medium text-foreground">{label}</span>
        <span className="shrink-0 tabular-nums text-muted-foreground">
          {formatCurrency(value)} <span className="text-[10px]">{DEFAULT_CURRENCY}</span>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted/80">
        <div
          className={`h-full rounded-full transition-[width] duration-500 ease-out ${accent ?? "bg-primary/85"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export type OverviewChartPayload = {
  expenseTotalAmount: number;
  expenseByMonth: Array<{ key: string; label: string; total: number }>;
  expenseByCategory: Array<{ category: string; total: number }>;
  topProjectsByExpense: Array<{ projectId: string; name: string; total: number }>;
  projects: number;
  expenses: number;
};

export function AdminOverviewCharts(data: OverviewChartPayload) {
  const maxMonth = Math.max(...data.expenseByMonth.map((m) => m.total), 1);
  const maxCat = Math.max(...data.expenseByCategory.map((c) => c.total), 1);
  const maxProj = Math.max(...data.topProjectsByExpense.map((p) => p.total), 1);

  return (
    <section aria-labelledby="dash-insights-heading" className="space-y-6">
      <h2 id="dash-insights-heading" className="dashboard-section-label">
        Insights
      </h2>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-primary/20 bg-linear-to-br from-primary/[0.06] to-card lg:col-span-1">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base font-semibold">Expense volume</CardTitle>
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/15">
                <Wallet className="size-4" strokeWidth={1.75} aria-hidden />
              </span>
            </div>
            <CardDescription>All recorded expenses ({DEFAULT_CURRENCY})</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
              {formatCurrency(data.expenseTotalAmount)}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {data.expenses.toLocaleString()} line items ·{" "}
              <Link href="/admin/expenses" className="font-medium text-primary underline-offset-4 hover:underline">
                Open expenses
              </Link>
            </p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base font-semibold">Projects</CardTitle>
              <span className="flex size-9 items-center justify-center rounded-xl bg-muted text-foreground/80 ring-1 ring-border/60">
                <FolderKanban className="size-4" strokeWidth={1.75} aria-hidden />
              </span>
            </div>
            <CardDescription>Active project count</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">{data.projects.toLocaleString()}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              <Link href="/admin/projects" className="font-medium text-primary underline-offset-4 hover:underline">
                Browse projects
              </Link>
            </p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base font-semibold">Top projects</CardTitle>
              <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/12 text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-400">
                <TrendingUp className="size-4" strokeWidth={1.75} aria-hidden />
              </span>
            </div>
            <CardDescription>By expense total ({DEFAULT_CURRENCY})</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.topProjectsByExpense.length === 0 ? (
              <p className="text-sm text-muted-foreground">No project-linked expenses yet.</p>
            ) : (
              data.topProjectsByExpense.map((p) => (
                <BarRow
                  key={p.projectId}
                  label={p.name}
                  value={p.total}
                  max={maxProj}
                  accent="bg-emerald-600/80 dark:bg-emerald-500/75"
                />
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Expenses by month</CardTitle>
            <CardDescription>Last six calendar months</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.expenseByMonth.map((m) => (
              <BarRow key={m.key} label={m.label} value={m.total} max={maxMonth} />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Expenses by category</CardTitle>
            <CardDescription>Top categories by amount</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.expenseByCategory.length === 0 ? (
              <p className="text-sm text-muted-foreground">No categories yet.</p>
            ) : (
              data.expenseByCategory.map((c) => (
                <BarRow
                  key={c.category}
                  label={c.category}
                  value={c.total}
                  max={maxCat}
                  accent="bg-amber-600/75 dark:bg-amber-500/70"
                />
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
