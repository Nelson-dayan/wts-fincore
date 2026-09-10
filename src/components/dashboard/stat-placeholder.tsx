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
        "group relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-border/70 bg-card/80 p-5 shadow-(--shadow-premium) backdrop-blur-[2px] transition-[box-shadow,border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-(--shadow-premium-lg) md:p-6",
        className
      )}
    >
      <div className="flex size-11 items-center justify-center rounded-xl bg-linear-to-br from-primary/12 to-primary/5 text-primary ring-1 ring-primary/12 transition-transform duration-200 group-hover:scale-[1.04]">
        <Icon className="size-5" strokeWidth={1.75} aria-hidden />
      </div>
      <div>
        <h3 className="font-semibold tracking-tight text-foreground">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-primary/6 blur-2xl transition-opacity duration-300 group-hover:opacity-100 dark:bg-primary/10" />
    </div>
  );
}
