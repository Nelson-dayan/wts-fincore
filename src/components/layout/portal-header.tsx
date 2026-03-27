import { ThemeToggle } from "@/components/theme/theme-toggle";
import { cn } from "@/lib/utils/cn";

export function PortalHeader({
  brand,
  children,
  className,
}: {
  brand: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "glass-card sticky top-0 z-30 border-b-0 !shadow-[var(--shadow-premium)] ring-1 ring-border/60",
        className
      )}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
        <div className="min-w-0 shrink-0">{brand}</div>
        <div className="flex flex-wrap items-center gap-1.5 sm:justify-end md:gap-2">
          {children}
          <div className="ml-auto flex items-center pl-2 sm:ml-0 sm:pl-0">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
