import { ThemeToggle } from "@/components/theme/theme-toggle";
import { cn } from "@/lib/utils/cn";

export function PortalHeader({
  brand,
  children,
  endActions,
  className,
}: {
  brand: React.ReactNode;
  children?: React.ReactNode;
  /** Shown before the theme toggle on the right (e.g. Sign out). */
  endActions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("portal-header-shell sticky top-0 z-30", className)}>
      <div className="relative mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:gap-5 lg:py-4 xl:gap-8">
        <div className="min-w-0 justify-self-center lg:justify-self-start">{brand}</div>
        <div className="flex min-w-0 justify-center justify-self-stretch px-0 sm:px-1">
          {children}
        </div>
        <div className="flex shrink-0 items-center justify-center gap-2 border-t border-border/40 pt-3 sm:pt-3 lg:justify-self-end lg:border-t-0 lg:pt-0">
          {endActions}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
