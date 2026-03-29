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
        "relative inline-flex shrink-0 items-center justify-center rounded-full px-3.5 py-2 text-[0.8125rem] font-medium tracking-tight transition-[color,background-color,box-shadow,transform] duration-200 ease-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/65 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "active:scale-[0.98]",
        active
          ? "bg-primary text-primary-foreground shadow-[0_1px_2px_hsl(0_0%_0%/0.12),inset_0_1px_0_hsl(0_0%_100%/0.15)] dark:shadow-[0_1px_3px_hsl(0_0%_0%/0.4),inset_0_1px_0_hsl(0_0%_100%/0.08)]"
          : cn(
              "text-muted-foreground",
              "hover:bg-muted/90 hover:text-foreground",
              "dark:text-muted-foreground/90 dark:hover:bg-white/[0.07] dark:hover:text-foreground"
            ),
        className
      )}
    >
      {children}
    </Link>
  );
}
