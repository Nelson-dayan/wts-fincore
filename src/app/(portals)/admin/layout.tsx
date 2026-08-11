import { Suspense } from "react";
import { PortalBrand } from "@/components/layout/portal-brand";
import { getPrimaryCompanyLogoForPortal } from "@/lib/company/get-primary-company-logo";
import { PortalMobileDrawer } from "@/components/layout/portal-mobile-drawer";
import { PortalNavLink } from "@/components/layout/portal-nav-link";
import { PortalShell } from "@/components/layout/portal-shell";
import { SignOutButton } from "@/components/portals/sign-out-button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { NotificationBell } from "@/components/portals/notification-bell";
import { CommandPalette } from "@/components/portals/command-palette";
import { CommandPaletteTrigger } from "@/components/portals/command-palette-trigger";
import { CompanySwitcher } from "@/components/companies/company-switcher";

async function AdminPortalBrand() {
  const brandLogoSrc = await getPrimaryCompanyLogoForPortal();
  return <PortalBrand variant="admin" brandLogoSrc={brandLogoSrc} />;
}

export default function AdminPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  return (
    <div className="flex min-h-dvh flex-col bg-background md:flex-row">
      <PortalMobileDrawer
        brand={
          <Suspense fallback={<PortalBrand variant="admin" brandLogoSrc={null} />}>
            <AdminPortalBrand />
          </Suspense>
        }
        actions={
          <>
            <NotificationBell />
            <ThemeToggle />
            <SignOutButton className="border-0 bg-transparent hover:bg-destructive/12" />
          </>
        }
      >
        <nav className="space-y-4" aria-label="Admin">
          <div className="space-y-2">
            <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/85">
              Core
            </p>
            <div className="grid gap-1.5">
              <PortalNavLink href="/admin" match="exact" className="w-full justify-start">
                Overview
              </PortalNavLink>
              <PortalNavLink href="/admin/users" match="prefix" className="w-full justify-start">
                Users
              </PortalNavLink>
              <PortalNavLink href="/admin/clients" match="prefix" className="w-full justify-start">
                Clients
              </PortalNavLink>
              <PortalNavLink href="/admin/projects" match="prefix" className="w-full justify-start">
                Projects
              </PortalNavLink>
              <PortalNavLink href="/admin/settings/companies" match="prefix" className="w-full justify-start">
                Companies
              </PortalNavLink>
              <PortalNavLink href="/admin/settings/company" match="prefix" className="w-full justify-start">
                Settings
              </PortalNavLink>
            </div>
          </div>

          <details className="group rounded-xl border border-border/60 bg-muted/25 p-2.5 open:bg-muted/35">
            <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/90 transition-colors hover:bg-primary/10">
              Finance
              <span className="text-sm leading-none transition-transform duration-200 group-open:rotate-180">
                ▾
              </span>
            </summary>
            <div className="mt-2 grid gap-1.5">
              <PortalNavLink href="/admin/quotations" match="prefix" className="w-full justify-start">
                Quotations
              </PortalNavLink>
              <PortalNavLink
                href="/admin/purchase-orders"
                match="prefix"
                className="w-full justify-start"
              >
                POs
              </PortalNavLink>
              <PortalNavLink href="/admin/invoices" match="prefix" className="w-full justify-start">
                Invoices
              </PortalNavLink>
              <PortalNavLink href="/admin/payments" match="prefix" className="w-full justify-start">
                Payments
              </PortalNavLink>
              <PortalNavLink href="/admin/accounts" match="prefix" className="w-full justify-start">
                Accounts
              </PortalNavLink>
              <PortalNavLink href="/admin/expenses" match="prefix" className="w-full justify-start">
                Expenses
              </PortalNavLink>
              <PortalNavLink href="/admin/activity" match="prefix" className="w-full justify-start">
                Activity Log
              </PortalNavLink>
            </div>
          </details>

          <details className="group rounded-xl border border-border/60 bg-muted/25 p-2.5 open:bg-muted/35">
            <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/90 transition-colors hover:bg-primary/10">
              Developer
              <span className="text-sm leading-none transition-transform duration-200 group-open:rotate-180">
                ▾
              </span>
            </summary>
            <div className="mt-2 grid gap-1.5">
              <PortalNavLink href="/admin/style-guide" match="prefix" className="w-full justify-start">
                Style Guide
              </PortalNavLink>
            </div>
          </details>
        </nav>
      </PortalMobileDrawer>

      <aside className="hidden border-b border-border/60 bg-card/70 backdrop-blur md:sticky md:top-0 md:block md:h-dvh md:w-72 md:shrink-0 md:border-b-0">
        <div className="flex h-full flex-col gap-5 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3 md:justify-start">
            <Suspense fallback={<PortalBrand variant="admin" brandLogoSrc={null} />}>
              <AdminPortalBrand />
            </Suspense>
          </div>

          <nav className="space-y-4" aria-label="Admin">
            <div className="space-y-2">
              <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/85">
                Core
              </p>
              <div className="grid gap-1.5">
                <PortalNavLink href="/admin" match="exact" className="w-full justify-start">
                  Overview
                </PortalNavLink>
                <PortalNavLink href="/admin/users" match="prefix" className="w-full justify-start">
                  Users
                </PortalNavLink>
                <PortalNavLink href="/admin/clients" match="prefix" className="w-full justify-start">
                  Clients
                </PortalNavLink>
                <PortalNavLink href="/admin/projects" match="prefix" className="w-full justify-start">
                  Projects
                </PortalNavLink>
                <PortalNavLink href="/admin/settings/company" match="prefix" className="w-full justify-start">
                  Settings
                </PortalNavLink>
              </div>
            </div>

            <details className="group rounded-xl border border-border/60 bg-muted/25 p-2.5 open:bg-muted/35">
              <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/90 transition-colors hover:bg-primary/10">
                Finance
                <span className="text-sm leading-none transition-transform duration-200 group-open:rotate-180">
                  ▾
                </span>
              </summary>
              <div className="mt-2 grid gap-1.5">
                <PortalNavLink href="/admin/quotations" match="prefix" className="w-full justify-start">
                  Quotations
                </PortalNavLink>
                <PortalNavLink href="/admin/purchase-orders" match="prefix" className="w-full justify-start">
                  POs
                </PortalNavLink>
                <PortalNavLink href="/admin/invoices" match="prefix" className="w-full justify-start">
                  Invoices
                </PortalNavLink>
                <PortalNavLink href="/admin/payments" match="prefix" className="w-full justify-start">
                  Payments
                </PortalNavLink>
                <PortalNavLink href="/admin/accounts" match="prefix" className="w-full justify-start">
                  Accounts
                </PortalNavLink>
                <PortalNavLink href="/admin/expenses" match="prefix" className="w-full justify-start">
                  Expenses
                </PortalNavLink>
                <PortalNavLink href="/admin/activity" match="prefix" className="w-full justify-start">
                  Activity Log
                </PortalNavLink>
              </div>
            </details>

            <details className="group rounded-xl border border-border/60 bg-muted/25 p-2.5 open:bg-muted/35">
              <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/90 transition-colors hover:bg-primary/10">
                Developer
                <span className="text-sm leading-none transition-transform duration-200 group-open:rotate-180">
                  ▾
                </span>
              </summary>
              <div className="mt-2 grid gap-1.5">
                <PortalNavLink href="/admin/style-guide" match="prefix" className="w-full justify-start">
                  Style Guide
                </PortalNavLink>
              </div>
            </details>
          </nav>

          <div className="mt-auto border-t border-border/60 pt-4" />
        </div>
      </aside>

      <PortalShell>
        <header className="sticky top-0 z-30 hidden border-b border-border/60 bg-card/70 backdrop-blur md:block">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <div className="flex-1 max-w-md">
              <CommandPaletteTrigger />
            </div>
            <div className="flex items-center gap-3">
              <CompanySwitcher />
              <NotificationBell />
              <ThemeToggle />
              <SignOutButton className="border-0 bg-transparent hover:bg-destructive/12" />
            </div>
          </div>
        </header>
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
          <Suspense fallback={<div className="h-64 flex items-center justify-center text-sm text-muted-foreground">Loading...</div>}>
            {children}
          </Suspense>
        </div>
      </PortalShell>
      <CommandPalette />
    </div>
  );
}
