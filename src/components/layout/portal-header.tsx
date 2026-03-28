import { ThemeToggle } from "@/components/theme/theme-toggle";
import { cn } from "@/lib/utils/cn";

export function PortalHeader({
  brand,
  children,
  actions,
  className,
}: {
  brand: React.ReactNode;
  /** Primary navigation (centered on large screens) */
  children?: React.ReactNode;
  /** Right cluster (e.g. workspace link, sign out); theme toggle is appended after this */
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 border-b",
        "border-border/45 bg-background/72 shadow-[0_1px_0_hsl(var(--border)/0.35)]",
        "backdrop-blur-2xl backdrop-saturate-150",
        "dark:border-white/[0.08] dark:bg-[hsl(var(--background)/0.52)] dark:shadow-[0_1px_0_hsl(0_0%_100%/0.06),0_16px_48px_-20px_hsl(0_0%_0%/0.55)]",
        className
      )}
    >
      <div
        className={cn(
          "mx-auto flex w-full max-w-[1440px] flex-col gap-3 px-4 py-3",
          "lg:grid lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center lg:gap-8 lg:px-8 lg:py-2.5"
        )}
      >
        {/* Mobile / tablet: brand + actions on one row; desktop: lg:contents splits into grid cells */}
        <div className="flex min-w-0 items-center justify-between gap-3 lg:contents">
          <div className="min-w-0 shrink lg:col-start-1 lg:row-start-1 lg:mr-0">{brand}</div>

          <div
            className={cn(
              "flex shrink-0 items-center justify-end gap-1.5",
              "lg:col-start-3 lg:row-start-1 lg:justify-self-end"
            )}
          >
            {actions}
            <ThemeToggle />
          </div>
        </div>

        {children ? (
          <div className="min-w-0 lg:col-start-2 lg:row-start-1">
            <div className="-mx-4 overflow-x-auto px-4 pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] lg:mx-0 lg:flex lg:justify-center lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden">
              {children}
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}
