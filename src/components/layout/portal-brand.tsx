import Link from "next/link";
import { LayoutDashboard, Sparkles } from "lucide-react";

export function PortalBrand({ variant }: { variant: "admin" | "employee" }) {
  const href = variant === "admin" ? "/admin" : "/employee";
  const Icon = variant === "admin" ? LayoutDashboard : Sparkles;
  const title = variant === "admin" ? "Admin" : "Workspace";
  const subtitle = variant === "admin" ? "Command center" : "Your hub";

  return (
    <Link
      href={href}
      className="group flex max-w-full items-center gap-3 rounded-xl py-0.5 pr-2 transition-opacity hover:opacity-95"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/18 to-primary/5 text-primary shadow-sm ring-1 ring-primary/18 transition-[box-shadow,transform] duration-200 group-hover:shadow-[0_0_0_1px_hsl(var(--primary)/0.22)] sm:size-10 dark:from-primary/25 dark:to-primary/[0.07] dark:ring-primary/25">
        <Icon className="size-4.25 sm:size-4.5" strokeWidth={1.75} aria-hidden />
      </span>
      <span className="min-w-0 text-left leading-tight">
        <span className="block truncate text-sm font-semibold tracking-tight">
          {title}
        </span>
        <span className="block text-[11px] font-medium text-muted-foreground">
          {subtitle}
        </span>
      </span>
    </Link>
  );
}
