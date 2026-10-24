import { Suspense } from "react";
import { PortalBrand } from "@/components/layout/portal-brand";
import { getPrimaryCompanyLogoForPortal } from "@/lib/company/get-primary-company-logo";
import { PortalMobileDrawer } from "@/components/layout/portal-mobile-drawer";
import { PortalNavLink } from "@/components/layout/portal-nav-link";
import { PortalShell } from "@/components/layout/portal-shell";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { EmployeePortalProviders } from "@/components/portals/employee-portal-providers";
import { PortalUserBadge } from "@/components/layout/portal-user-badge";
import { PortalUserMenu } from "@/components/layout/portal-user-menu";
import {
  LayoutDashboard,
  FolderKanban,
  FileText,
  ShoppingBag,
  Receipt,
  CreditCard,
  Wallet,
  Bell,
  UserCircle,
} from "lucide-react";

import { connection } from "next/server";

async function EmployeePortalBrand() {
  const brandLogoSrc = await getPrimaryCompanyLogoForPortal();
  return <PortalBrand variant="employee" brandLogoSrc={brandLogoSrc} />;
}

export default async function EmployeePortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();
  return (
    <div className="flex min-h-dvh flex-col bg-background md:flex-row font-sans text-foreground antialiased">
      {/* Mobile Navigation Drawer */}
      <PortalMobileDrawer
        brand={
          <Suspense fallback={<PortalBrand variant="employee" brandLogoSrc={null} />}>
            <EmployeePortalBrand />
          </Suspense>
        }
        actions={
          <>
            <ThemeToggle />
            <PortalUserMenu portal="employee" />
          </>
        }
      >
        <nav className="space-y-6" aria-label="Employee Mobile">
          <div className="space-y-1.5">
            <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
              Core Workspace
            </p>
            <div className="grid gap-1">
              <PortalNavLink href="/employee" match="exact" className="w-full justify-start gap-2.5">
                <LayoutDashboard className="size-4 shrink-0" />
                <span>Overview</span>
              </PortalNavLink>
              <PortalNavLink href="/employee/projects" match="prefix" className="w-full justify-start gap-2.5">
                <FolderKanban className="size-4 shrink-0" />
                <span>Projects</span>
              </PortalNavLink>
              <PortalNavLink href="/employee/profile" match="prefix" className="w-full justify-start gap-2.5">
                <UserCircle className="size-4 shrink-0 text-primary" />
                <span>My Profile</span>
              </PortalNavLink>
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
              Financial Operations
            </p>
            <div className="grid gap-1">
              <PortalNavLink href="/employee/quotations" match="prefix" className="w-full justify-start gap-2.5">
                <FileText className="size-4 shrink-0" />
                <span>Quotations</span>
              </PortalNavLink>
              <PortalNavLink href="/employee/purchase-orders" match="prefix" className="w-full justify-start gap-2.5">
                <ShoppingBag className="size-4 shrink-0" />
                <span>Purchase Orders</span>
              </PortalNavLink>
              <PortalNavLink href="/employee/invoices" match="prefix" className="w-full justify-start gap-2.5">
                <Receipt className="size-4 shrink-0" />
                <span>Invoices</span>
              </PortalNavLink>
              <PortalNavLink href="/employee/payments" match="prefix" className="w-full justify-start gap-2.5">
                <CreditCard className="size-4 shrink-0" />
                <span>Payments</span>
              </PortalNavLink>
              <PortalNavLink href="/employee/expenses" match="prefix" className="w-full justify-start gap-2.5">
                <Wallet className="size-4 shrink-0" />
                <span>Expenses</span>
              </PortalNavLink>
              <PortalNavLink href="/employee/notifications" match="prefix" className="w-full justify-start gap-2.5">
                <Bell className="size-4 shrink-0" />
                <span>Notifications</span>
              </PortalNavLink>
            </div>
          </div>
        </nav>

        <div className="pt-4">
          <PortalUserBadge portal="employee" />
        </div>
      </PortalMobileDrawer>

      {/* Desktop Sidebar Navigation */}
      <aside className="hidden border-r border-border/80 bg-card text-card-foreground md:sticky md:top-0 md:block md:h-dvh md:w-64 md:shrink-0">
        <div className="flex h-full flex-col justify-between p-4">
          <div className="space-y-6">
            <div className="px-2 py-1">
              <Suspense fallback={<PortalBrand variant="employee" brandLogoSrc={null} />}>
                <EmployeePortalBrand />
              </Suspense>
            </div>

            <nav className="space-y-5" aria-label="Employee Desktop">
              <div className="space-y-1">
                <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                  Core Workspace
                </p>
                <div className="space-y-0.5">
                  <PortalNavLink href="/employee" match="exact" className="w-full justify-start gap-2.5">
                    <LayoutDashboard className="size-4 shrink-0" />
                    <span>Overview</span>
                  </PortalNavLink>
                  <PortalNavLink href="/employee/projects" match="prefix" className="w-full justify-start gap-2.5">
                    <FolderKanban className="size-4 shrink-0" />
                    <span>Projects</span>
                  </PortalNavLink>
                  <PortalNavLink href="/employee/profile" match="prefix" className="w-full justify-start gap-2.5">
                    <UserCircle className="size-4 shrink-0 text-primary" />
                    <span>My Profile</span>
                  </PortalNavLink>
                </div>
              </div>

              <div className="space-y-1">
                <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                  Finance Operations
                </p>
                <div className="space-y-0.5">
                  <PortalNavLink href="/employee/quotations" match="prefix" className="w-full justify-start gap-2.5">
                    <FileText className="size-4 shrink-0" />
                    <span>Quotations</span>
                  </PortalNavLink>
                  <PortalNavLink href="/employee/purchase-orders" match="prefix" className="w-full justify-start gap-2.5">
                    <ShoppingBag className="size-4 shrink-0" />
                    <span>Purchase Orders</span>
                  </PortalNavLink>
                  <PortalNavLink href="/employee/invoices" match="prefix" className="w-full justify-start gap-2.5">
                    <Receipt className="size-4 shrink-0" />
                    <span>Invoices</span>
                  </PortalNavLink>
                  <PortalNavLink href="/employee/payments" match="prefix" className="w-full justify-start gap-2.5">
                    <CreditCard className="size-4 shrink-0" />
                    <span>Payments</span>
                  </PortalNavLink>
                  <PortalNavLink href="/employee/expenses" match="prefix" className="w-full justify-start gap-2.5">
                    <Wallet className="size-4 shrink-0" />
                    <span>Expenses</span>
                  </PortalNavLink>
                  <PortalNavLink href="/employee/notifications" match="prefix" className="w-full justify-start gap-2.5">
                    <Bell className="size-4 shrink-0" />
                    <span>Notifications</span>
                  </PortalNavLink>
                </div>
              </div>
            </nav>
          </div>

          <div className="border-t border-border/80 pt-3 space-y-2">
            <PortalUserBadge portal="employee" />
            <div className="px-2 py-1 flex items-center justify-between text-[11px] text-muted-foreground font-mono">
              <span>Sec-DocuTrade v2.5</span>
              <span className="text-emerald-500 font-semibold">• Live</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area Shell */}
      <PortalShell>
        <header className="sticky top-0 z-30 hidden border-b border-border/80 bg-card/90 backdrop-blur-md md:block">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-end gap-2.5 px-6 py-3">
            <ThemeToggle />
            <PortalUserMenu portal="employee" />
          </div>
        </header>
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-8 sm:py-8">
          <Suspense fallback={<div className="h-64 flex items-center justify-center text-sm text-muted-foreground">Loading...</div>}>
            <EmployeePortalProviders>{children}</EmployeePortalProviders>
          </Suspense>
        </div>
      </PortalShell>
    </div>
  );
}
