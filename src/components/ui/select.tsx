import * as React from "react";
import { cn } from "@/lib/utils/cn";

type Option = {
  value: string;
  label: string;
};

export function Select({
  className,
  options,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  options: Option[];
}) {
  return (
    <div className="relative">
      <select
        className={cn(
          "h-9 w-full appearance-none rounded-xl border border-border bg-background px-3 pr-9 text-sm shadow-sm transition-colors focus:border-primary/40 focus:outline-none",
          className
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
        ▼
      </span>
    </div>
  );
}
