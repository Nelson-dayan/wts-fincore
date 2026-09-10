import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export interface DashboardPageHeaderProps {
  title: string;
  description?: ReactNode;
  eyebrow?: string;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function DashboardPageHeader({
  title,
  description,
  eyebrow,
  actions,
  children,
  className,
}: DashboardPageHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-4 pb-6 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div className="space-y-1">
        {eyebrow ? (
          <p className="text-xs font-mono font-semibold uppercase tracking-wider text-primary">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-foreground break-words">
          {title}
        </h1>
        {description != null && description !== "" ? (
          <div className="text-xs text-muted-foreground sm:text-sm max-w-2xl">
            {description}
          </div>
        ) : null}
      </div>

      {(actions || children) && (
        <div className="flex flex-wrap items-center gap-2.5 shrink-0 sm:pt-0">
          {actions}
          {children}
        </div>
      )}
    </header>
  );
}
