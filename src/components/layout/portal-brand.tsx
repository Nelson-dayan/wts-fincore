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
      className="group flex max-w-full items-center gap-3 rounded-xl py-0.5 pr-2 outline-none transition-opacity hover:opacity-95 focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary ring-1 ring-primary/15 transition-[box-shadow] duration-200 group-hover:shadow-[0_0_0_1px_hsl(var(--primary)/0.2)]">
        <Icon className="size-[18px]" strokeWidth={1.75} aria-hidden />
      </span>
      <span className="min-w-0 text-left leading-tight">
        <span className="block truncate text-sm font-semibold tracking-tight text-foreground">
          {title}
        </span>
        <span className="mt-0.5 block text-[11px] font-medium text-muted-foreground">
          {subtitle}
        </span>
      </span>
    </Link>
  );
}
