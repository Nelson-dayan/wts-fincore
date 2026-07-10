export const unstable_instant = false;

import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/options";
import { PortalBrand } from "@/components/layout/portal-brand";
import { getPrimaryCompanyLogoForPortal } from "@/lib/company/get-primary-company-logo";
import { PortalMobileDrawer } from "@/components/layout/portal-mobile-drawer";
import { PortalNavLink } from "@/components/layout/portal-nav-link";
import { PortalShell } from "@/components/layout/portal-shell";
import { SignOutButton } from "@/components/portals/sign-out-button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { User } from "lucide-react";
import { EmployeePortalProviders } from "@/components/portals/employee-portal-providers";

export default async function EmployeePortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const brandLogoSrc = await getPrimaryCompanyLogoForPortal();

  return (
    <div className="flex min-h-dvh flex-col bg-background md:flex-row">
      <PortalMobileDrawer
        brand={<PortalBrand variant="employee" brandLogoSrc={brandLogoSrc} />}
        actions={
          <>
            <ThemeToggle />
            <SignOutButton className="border-0 bg-transparent hover:bg-destructive/12" />
          </>
        }
      >
        <nav className="space-y-2" aria-label="Employee">
          <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/85">Core</p>
          <div className="grid gap-1.5">
            <PortalNavLink href="/employee" match="exact" className="w-full justify-start">
              Overview
            </PortalNavLink>
            <PortalNavLink href="/employee/projects" match="prefix" className="w-full justify-start">
              Projects
            </PortalNavLink>
            <PortalNavLink href="/employee/quotations" match="prefix" className="w-full justify-start">
              Quotations
            </PortalNavLink>
            <PortalNavLink href="/employee/purchase-orders" match="prefix" className="w-full justify-start">
              POs
            </PortalNavLink>
            <PortalNavLink href="/employee/invoices" match="prefix" className="w-full justify-start">
              Invoices
            </PortalNavLink>
            <PortalNavLink href="/employee/payments" match="prefix" className="w-full justify-start">
              Payments
            </PortalNavLink>
            <PortalNavLink href="/employee/expenses" match="prefix" className="w-full justify-start">
              Expenses
            </PortalNavLink>
          </div>
        </nav>

        <div className="mt-auto space-y-3 border-t border-border/60 pt-4">
          <span className="inline-flex w-full items-center gap-2 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground ring-1 ring-border/60 sm:text-sm">
            <User className="size-3.5 shrink-0 opacity-70" aria-hidden />
            <span className="truncate" title={session.user.email ?? undefined}>
              {session.user.email}
            </span>
          </span>
          {session.user.role === "admin" ? (
            <Link
              href="/admin"
              className="inline-flex rounded-xl px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
            >
              Admin
            </Link>
          ) : null}
        </div>
      </PortalMobileDrawer>

      <aside className="hidden border-b border-border/60 bg-card/70 backdrop-blur md:sticky md:top-0 md:block md:h-dvh md:w-72 md:shrink-0 md:border-b-0">
        <div className="flex h-full flex-col gap-5 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3 md:justify-start">
            <PortalBrand variant="employee" brandLogoSrc={brandLogoSrc} />
          </div>

          <nav className="space-y-2" aria-label="Employee">
            <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/85">
              Core
            </p>
            <div className="grid gap-1.5">
              <PortalNavLink href="/employee" match="exact" className="w-full justify-start">
                Overview
              </PortalNavLink>
              <PortalNavLink href="/employee/projects" match="prefix" className="w-full justify-start">
                Projects
              </PortalNavLink>
              <PortalNavLink href="/employee/quotations" match="prefix" className="w-full justify-start">
                Quotations
              </PortalNavLink>
              <PortalNavLink href="/employee/purchase-orders" match="prefix" className="w-full justify-start">
                POs
              </PortalNavLink>
              <PortalNavLink href="/employee/invoices" match="prefix" className="w-full justify-start">
                Invoices
              </PortalNavLink>
              <PortalNavLink href="/employee/payments" match="prefix" className="w-full justify-start">
                Payments
              </PortalNavLink>
              <PortalNavLink href="/employee/expenses" match="prefix" className="w-full justify-start">
                Expenses
              </PortalNavLink>
            </div>
          </nav>

          <div className="mt-auto space-y-3 border-t border-border/60 pt-4">
            <span className="inline-flex w-full items-center gap-2 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground ring-1 ring-border/60 sm:text-sm">
              <User className="size-3.5 shrink-0 opacity-70" aria-hidden />
              <span className="truncate" title={session.user.email ?? undefined}>
                {session.user.email}
              </span>
            </span>
            {session.user.role === "admin" ? (
              <Link
                href="/admin"
                className="inline-flex rounded-xl px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
              >
                Admin
              </Link>
            ) : null}
          </div>
        </div>
      </aside>

      <PortalShell>
        <header className="sticky top-0 z-30 hidden border-b border-border/60 bg-card/70 backdrop-blur md:block">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-end gap-2 px-4 py-3 sm:px-6">
            <ThemeToggle />
            <SignOutButton className="border-0 bg-transparent hover:bg-destructive/12" />
          </div>
        </header>
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
          <EmployeePortalProviders>{children}</EmployeePortalProviders>
        </div>
      </PortalShell>
    </div>
  );
}
