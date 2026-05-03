import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type DropdownOption = {
  value: string;
  label: string;
};

export function Select({
  className,
  options,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  options: DropdownOption[];
}) {
  return (
    <div className="relative">
      <select
        className={cn(
          "h-10 w-full appearance-none rounded-lg border border-input bg-background/60 px-3.5 pr-9 text-sm shadow-sm transition-all duration-200",
          "hover:border-border focus:border-ring/60 focus:bg-background",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-0",
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
      <ChevronDown
        className="pointer-events-none absolute inset-y-0 right-3 my-auto size-4 text-muted-foreground"
        aria-hidden
      />
    </div>
  );
}

// "Dropdown" alias for consistent naming across the app.
export const Dropdown = Select;
