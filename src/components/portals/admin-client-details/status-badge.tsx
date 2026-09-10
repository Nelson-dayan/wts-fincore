"use client";

import { cn } from "@/lib/utils/cn";

export function StatusBadge({ value }: { value: string }) {
  const normalized = value.toLowerCase();
  let styles =
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset transition-colors duration-150";
  if (
    normalized.includes("complet") ||
    normalized === "paid" ||
    normalized === "approved" ||
    normalized === "active" ||
    normalized === "closed"
  ) {
    styles += cn(
      " bg-emerald-500/10 text-emerald-800 ring-emerald-500/20",
      "dark:text-emerald-400"
    );
  } else if (
    normalized.includes("pend") ||
    normalized.includes("draft") ||
    normalized === "open" ||
    normalized.includes("progress")
  ) {
    styles += cn(
      " bg-amber-500/10 text-amber-900 ring-amber-500/25",
      "dark:text-amber-400"
    );
  } else if (
    normalized.includes("cancel") ||
    normalized.includes("reject") ||
    normalized.includes("void") ||
    normalized.includes("overdue")
  ) {
    styles += " bg-destructive/10 text-destructive ring-destructive/20";
  } else if (normalized.includes("high") || normalized === "urgent") {
    styles += cn(
      " bg-orange-500/10 text-orange-900 ring-orange-500/25",
      "dark:text-orange-400"
    );
  } else if (normalized.includes("low") || normalized === "medium") {
    styles += " bg-slate-500/10 text-slate-700 ring-slate-500/20 dark:text-slate-300";
  } else {
    styles += " bg-muted text-muted-foreground ring-border/60";
  }
  return <span className={styles}>{value}</span>;
}
