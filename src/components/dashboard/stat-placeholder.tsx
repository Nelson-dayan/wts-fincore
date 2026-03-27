import { cn } from "@/lib/utils/cn";
import type { LucideIcon } from "lucide-react";

export function StatPlaceholder({
  icon: Icon,
  title,
  description,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-border/80 bg-card p-5 shadow-[var(--shadow-premium)] transition-all duration-300 hover:border-primary/20 hover:shadow-[var(--shadow-premium-lg)] md:p-6",
        className
      )}
    >
      <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15 transition-transform duration-300 group-hover:scale-105">
        <Icon className="size-5" strokeWidth={1.75} aria-hidden />
      </div>
      <div>
        <h3 className="font-semibold tracking-tight text-foreground">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/5 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />
    </div>
  );
}
