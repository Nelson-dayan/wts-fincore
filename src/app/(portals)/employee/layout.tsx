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

export default async function EmployeePortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <PortalHeader brand={<PortalBrand variant="employee" />}>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end sm:gap-2.5">
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
          <span className="inline-flex max-w-[min(100%,14rem)] items-center gap-2 rounded-xl bg-card/70 px-3 py-2 text-xs text-muted-foreground shadow-[0_1px_0_hsl(var(--border)/0.6)] ring-1 ring-border/50 backdrop-blur-sm sm:max-w-xs sm:text-sm">
            <User className="size-3.5 shrink-0 opacity-70" aria-hidden />
            <span className="truncate" title={session.user.email ?? undefined}>
              {session.user.email}
            </span>
          </span>
          {session.user.role === "admin" ? (
            <Link
              href="/admin"
              className="rounded-lg px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
            >
              Admin
            </Link>
          ) : null}
          <SignOutButton />
        </div>
      </PortalHeader>
      <PortalShell>
        <div className="mx-auto max-w-6xl px-4 py-9 sm:px-6 sm:py-11">
          {children}
        </div>
      </PortalShell>
    </div>
  );
}
