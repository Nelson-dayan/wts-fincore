import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export function DashboardPageHeader({
  title,
  description,
  eyebrow,
  className,
}: {
  title: string;
  description?: ReactNode;
  /** Small label above the title (e.g. "Admin overview"). */
  eyebrow?: string;
  className?: string;
}) {
  return (
    <header className={cn("dashboard-page-hero", className)}>
      {eyebrow ? <p className="dashboard-page-hero__eyebrow">{eyebrow}</p> : null}
      <h1 className="font-brand text-2xl font-semibold tracking-tight text-foreground md:text-[1.75rem]">
        {title}
      </h1>
      {description != null && description !== "" ? (
        <div className="mt-3 max-w-3xl text-[0.9375rem] leading-relaxed text-muted-foreground md:text-[0.96875rem]">
          {description}
        </div>
      ) : null}
    </header>
  );
}
