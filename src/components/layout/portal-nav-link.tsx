"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

type MatchMode = "exact" | "prefix";

export function PortalNavLink({
  href,
  children,
  match = "exact",
  className,
}: {
  href: string;
  children: React.ReactNode;
  match?: MatchMode;
  className?: string;
}) {
  const pathname = usePathname() ?? "";
  const active =
    match === "exact" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={cn(
        "relative inline-flex shrink-0 cursor-pointer items-center rounded-xl px-3 py-2 text-sm font-medium tracking-tight outline-none transition-[transform,box-shadow,background-color,color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none",
        active
          ? [
              "bg-primary/20 text-primary shadow-[0_0_28px_-8px_hsl(var(--primary)/0.55),inset_0_1px_0_0_hsl(0_0%_100%/0.08)]",
              "ring-1 ring-primary/35 dark:bg-primary/22 dark:text-primary dark:shadow-[0_0_32px_-6px_hsl(var(--primary)/0.45),inset_0_1px_0_0_hsl(0_0%_100%/0.06)]",
            ].join(" ")
          : [
              "text-muted-foreground hover:-translate-y-px hover:bg-accent/75 hover:text-foreground active:translate-y-0",
              "motion-reduce:hover:translate-y-0",
            ].join(" "),
        className
      )}
    >
      {children}
    </Link>
  );
}
