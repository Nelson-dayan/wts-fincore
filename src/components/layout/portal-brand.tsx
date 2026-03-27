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
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/15 transition-transform duration-200 group-hover:scale-[1.03]">
        <Icon className="size-[18px]" strokeWidth={1.75} aria-hidden />
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
