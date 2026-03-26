import { ThemeToggle } from "@/components/theme/theme-toggle";

export function PortalHeader({
  brand,
  children,
}: {
  brand: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-card/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="min-w-0 shrink">{brand}</div>
        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-4">
          {children}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
