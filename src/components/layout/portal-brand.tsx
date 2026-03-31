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
      className="group flex max-w-full items-center gap-3.5 rounded-2xl py-0.5 pr-2 transition-[opacity,transform] duration-200 hover:opacity-[0.97] active:scale-[0.99] motion-reduce:active:scale-100"
    >
      <span
        className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[linear-gradient(to_bottom_right,hsl(var(--primary)/0.28),hsl(var(--primary)/0.12),hsl(var(--primary)/0.06))] text-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.2),0_12px_28px_-14px_hsl(var(--primary)/0.45)] ring-1 ring-primary/25 transition-[box-shadow,transform] duration-300 group-hover:shadow-[0_0_0_1px_hsl(var(--primary)/0.32),0_16px_36px_-12px_hsl(var(--primary)/0.5)] sm:size-11 dark:bg-[linear-gradient(to_bottom_right,hsl(var(--primary)/0.35),hsl(var(--primary)/0.15),hsl(var(--primary)/0.05))] dark:shadow-[0_0_0_1px_hsl(var(--primary)/0.28),0_14px_40px_-12px_hsl(var(--primary)/0.4)]"
        aria-hidden
      >
        <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_80%_at_30%_20%,hsl(0_0%_100%/0.14),transparent_60%)]" />
        <Icon className="relative size-4.5 sm:size-[1.15rem]" strokeWidth={1.65} aria-hidden />
      </span>
      <span className="min-w-0 text-left leading-tight">
        <span className="font-brand block truncate text-[15px] font-semibold tracking-tight sm:text-base">
          {title}
        </span>
        <span className="mt-0.5 block text-[11px] font-medium tracking-wide text-muted-foreground/90">
          {subtitle}
        </span>
      </span>
    </Link>
  );
}
