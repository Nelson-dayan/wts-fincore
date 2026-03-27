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
      className="group flex max-w-full items-center gap-2.5 rounded-xl py-0.5 pr-2 outline-none transition-[opacity,transform] duration-200 hover:opacity-95 active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:gap-3"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/18 to-primary/5 text-primary shadow-sm ring-1 ring-primary/18 transition-[box-shadow,transform] duration-200 group-hover:shadow-[0_0_0_1px_hsl(var(--primary)/0.22)] sm:size-10 dark:from-primary/25 dark:to-primary/[0.07] dark:ring-primary/25">
        <Icon className="size-[17px] sm:size-[18px]" strokeWidth={1.75} aria-hidden />
      </span>
      <span className="min-w-0 text-left leading-tight">
        <span className="block truncate text-[13px] font-semibold tracking-tight text-foreground sm:text-sm">
          {title}
        </span>
        <span className="mt-0.5 block text-[10px] font-medium text-muted-foreground sm:text-[11px]">
          {subtitle}
        </span>
      </span>
    </Link>
  );
}
