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
        "sticky top-0 z-30 border-b border-border/50 bg-background/75 shadow-sm backdrop-blur-xl backdrop-saturate-150 dark:bg-background/65",
        className
      )}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-6 sm:py-4">
        <div className="min-w-0 shrink-0 pt-0.5">{brand}</div>
        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:items-end">
          <div className="flex w-full flex-wrap items-center gap-2 sm:justify-end md:gap-2.5">
            {children}
            <div className="ml-auto flex shrink-0 items-center sm:ml-0">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
