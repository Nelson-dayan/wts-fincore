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
        "rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
        active
          ? "bg-primary/12 text-primary ring-1 ring-primary/20"
          : "text-muted-foreground hover:bg-accent/80 hover:text-foreground",
        className
      )}
    >
      {children}
    </Link>
  );
}
