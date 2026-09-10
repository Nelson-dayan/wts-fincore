"use client";

import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "./status-badge";

function renderCell(columnKey: string, raw: unknown): React.ReactNode {
  const val = String(raw ?? "—");
  if (val === "—") return <span className="text-muted-foreground">—</span>;
  if (columnKey === "status" || columnKey === "priority") {
    return <StatusBadge value={val} />;
  }
  if (columnKey === "type") {
    return (
      <span className="inline-flex rounded-md bg-secondary/70 px-2 py-0.5 text-xs font-medium text-secondary-foreground ring-1 ring-border/55 dark:bg-secondary/40">
        {val}
      </span>
    );
  }
  if (columnKey === "expenseTotal" || columnKey === "amount") {
    return <span className="tabular-nums text-foreground/95">{val}</span>;
  }
  return <span className="text-foreground/95">{val}</span>;
}

type SectionTableProps = {
  title: string;
  columns: Array<{ key: string; label: string }>;
  rows: Array<Record<string, unknown>>;
  icon: LucideIcon;
  actionHref?: string;
  actionLabel?: string;
};

export function SectionTable({
  title,
  columns,
  rows,
  icon: Icon,
  actionHref,
  actionLabel,
}: SectionTableProps) {
  return (
    <Card className="group mb-5 border-border/70 bg-card/90 shadow-(--shadow-premium) backdrop-blur-[2px] transition-[box-shadow,border-color] duration-200 hover:border-primary/12 hover:shadow-(--shadow-premium-lg)">
      <CardHeader className="flex flex-col gap-3 space-y-0 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted/80 text-foreground/80 ring-1 ring-border/50 transition-transform duration-200 group-hover:scale-[1.02] dark:bg-muted/45">
            <Icon className="size-4.5" strokeWidth={1.75} aria-hidden />
          </span>
          <div>
            <CardTitle className="flex flex-wrap items-center gap-2 text-base font-semibold tracking-tight sm:text-lg">
              {title}
              <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-primary ring-1 ring-primary/15">
                {rows.length}
              </span>
            </CardTitle>
            <CardDescription className="mt-1 text-[0.8125rem]">Linked records for this client</CardDescription>
          </div>
        </div>
        {actionHref && actionLabel ? (
          <div className="flex w-full shrink-0 sm:ml-4 sm:w-auto">
            <Button
              size="sm"
              variant="outline"
              asChild
              className="gap-1.5 transition-[box-shadow,border-color] duration-200 hover:border-primary/35 hover:bg-primary/5"
            >
              <a href={actionHref}>{actionLabel}</a>
            </Button>
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="overflow-hidden rounded-xl border border-border/60 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-190 text-left text-[0.8125rem]">
              <thead>
                <tr className="border-b border-border/60 bg-muted/45 dark:bg-muted/25">
                  {columns.map((column) => (
                    <th
                      key={column.key}
                      className="whitespace-nowrap px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      No records in this section yet.
                    </td>
                  </tr>
                ) : (
                  rows.map((row, idx) => (
                    <tr
                      key={String(row._id ?? idx)}
                      className="bg-card/40 transition-[background-color] duration-150 hover:bg-muted/35 dark:hover:bg-muted/20"
                    >
                      {columns.map((column) => (
                        <td key={column.key} className="px-4 py-3 align-middle">
                          {renderCell(column.key, row[column.key])}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
