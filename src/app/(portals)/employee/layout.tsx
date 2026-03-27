import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/options";
import { PortalBrand } from "@/components/layout/portal-brand";
import { PortalHeader } from "@/components/layout/portal-header";
import { PortalNavLink } from "@/components/layout/portal-nav-link";
import { PortalShell } from "@/components/layout/portal-shell";
import { SignOutButton } from "@/components/portals/sign-out-button";
import { User } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const navGroupClass = cn(
  "inline-flex w-max max-w-[calc(100vw-2rem)] flex-wrap items-center gap-1 rounded-2xl p-1",
  "border border-border/50 bg-muted/35 shadow-[0_1px_0_hsl(var(--border)/0.35)]",
  "dark:border-white/[0.07] dark:bg-white/[0.04] dark:shadow-[inset_0_1px_0_hsl(0_0%_100%/0.04)]"
);

export default async function EmployeePortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <PortalHeader
        brand={<PortalBrand variant="employee" />}
        actions={
          <>
            <span
              className={cn(
                "inline-flex max-w-[min(100%,12rem)] items-center gap-2 rounded-full bg-background/60 px-2.5 py-1.5 text-[11px] text-muted-foreground shadow-sm ring-1 ring-border/55 backdrop-blur-sm sm:max-w-xs sm:px-3 sm:py-2 sm:text-xs md:text-sm",
                "dark:bg-white/[0.05] dark:ring-white/[0.08]"
              )}
            >
              <User className="size-3.5 shrink-0 opacity-70" aria-hidden />
              <span className="truncate" title={session.user.email ?? undefined}>
                {session.user.email}
              </span>
            </span>
            {session.user.role === "admin" ? (
              <Link
                href="/admin"
                className={cn(
                  "inline-flex h-9 shrink-0 items-center justify-center rounded-full px-3.5 text-[0.8125rem] font-semibold text-primary transition-[color,background-color,transform] duration-200 ease-out",
                  "hover:bg-primary/12 active:scale-[0.98]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                )}
              >
                Admin
              </Link>
            ) : null}
            <SignOutButton />
          </>
        }
      >
        <nav className="flex w-max flex-col gap-2 lg:mx-auto" aria-label="Employee workspace">
          <div className={navGroupClass}>
            <PortalNavLink href="/employee" match="exact">
              Overview
            </PortalNavLink>
            <PortalNavLink href="/employee/projects" match="prefix">
              Projects
            </PortalNavLink>
            <PortalNavLink href="/employee/quotations" match="prefix">
              Quotations
            </PortalNavLink>
            <PortalNavLink href="/employee/invoices" match="prefix">
              Invoices
            </PortalNavLink>
            <PortalNavLink href="/employee/expenses" match="prefix">
              Expenses
            </PortalNavLink>
          </div>
        </nav>
      </PortalHeader>
      <PortalShell>
        <div className="mx-auto max-w-6xl px-4 py-9 sm:px-6 sm:py-11">
          {children}
        </div>
      </PortalShell>
    </div>
  );
}
