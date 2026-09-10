"use client";

import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type DateRangeOption = "this_month" | "last_30_days" | "ytd" | "last_6_months" | "all_time";

const RANGE_LABELS: Record<DateRangeOption, string> = {
  this_month: "This Month",
  last_30_days: "Last 30 Days",
  ytd: "Year to Date (YTD)",
  last_6_months: "Last 6 Months",
  all_time: "All Time",
};

export function DateRangeSelector({
  value,
  onChange,
  className,
}: {
  value: DateRangeOption;
  onChange: (val: DateRangeOption) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-1.5 p-1 rounded-xl bg-muted/40 border border-border/60", className)}>
      <div className="flex items-center gap-1.5 px-2.5 py-1 text-muted-foreground text-xs font-semibold">
        <Calendar className="w-3.5 h-3.5 text-primary" />
        <span className="hidden sm:inline">Time Period:</span>
      </div>
      <div className="flex items-center gap-1 overflow-x-auto">
        {(Object.keys(RANGE_LABELS) as DateRangeOption[]).map((key) => {
          const isActive = value === key;
          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
                isActive
                  ? "bg-primary text-primary-foreground font-bold shadow-sm scale-[1.02]"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
            >
              {RANGE_LABELS[key]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
