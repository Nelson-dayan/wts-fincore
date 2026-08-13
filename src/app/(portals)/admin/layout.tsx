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
import { 
  LayoutDashboard, 
  Users, 
  UserCheck, 
  FolderKanban, 
  Building2, 
  Network,
  Settings, 
  FileText, 
  ShoppingBag, 
  Receipt, 
  CreditCard, 
  Wallet, 
  DollarSign, 
  History, 
  Palette 
} from "lucide-react";

import { connection } from "next/server";

async function AdminPortalBrand() {
  const brandLogoSrc = await getPrimaryCompanyLogoForPortal();
  return <PortalBrand variant="admin" brandLogoSrc={brandLogoSrc} />;
}

import { CompanyContextInterceptor } from "@/components/providers/company-context-interceptor";

export default async function AdminPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();
  return (
    <div className="flex min-h-dvh flex-col bg-background md:flex-row font-sans text-foreground antialiased">
      <CompanyContextInterceptor />
      {/* Mobile Navigation Drawer */}
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
        <nav className="space-y-6" aria-label="Admin Mobile">
          <div className="px-1 py-1">
            <CompanySwitcher />
          </div>
          <div className="space-y-1.5">
            <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
              Core Workspace
            </p>
            <div className="grid gap-1">
              <PortalNavLink href="/admin" match="exact" className="w-full justify-start gap-2.5">
                <LayoutDashboard className="size-4 shrink-0" />
                <span>Overview</span>
              </PortalNavLink>
              <PortalNavLink href="/admin/users" match="prefix" className="w-full justify-start gap-2.5">
                <Users className="size-4 shrink-0" />
                <span>Users</span>
              </PortalNavLink>
              <PortalNavLink href="/admin/clients" match="prefix" className="w-full justify-start gap-2.5">
                <UserCheck className="size-4 shrink-0" />
                <span>Clients</span>
              </PortalNavLink>
              <PortalNavLink href="/admin/projects" match="prefix" className="w-full justify-start gap-2.5">
                <FolderKanban className="size-4 shrink-0" />
                <span>Projects</span>
              </PortalNavLink>
              <PortalNavLink href="/admin/settings/companies" match="prefix" className="w-full justify-start gap-2.5">
                <Network className="size-4 shrink-0 text-primary" />
                <span>Corporate Hierarchy</span>
              </PortalNavLink>
              <PortalNavLink href="/admin/settings/company" match="exact" className="w-full justify-start gap-2.5">
                <Building2 className="size-4 shrink-0" />
                <span>Company Profile</span>
              </PortalNavLink>
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
              Financial Operations
            </p>
            <div className="grid gap-1">
              <PortalNavLink href="/admin/quotations" match="prefix" className="w-full justify-start gap-2.5">
                <FileText className="size-4 shrink-0" />
                <span>Quotations</span>
              </PortalNavLink>
              <PortalNavLink href="/admin/purchase-orders" match="prefix" className="w-full justify-start gap-2.5">
                <ShoppingBag className="size-4 shrink-0" />
                <span>Purchase Orders</span>
              </PortalNavLink>
              <PortalNavLink href="/admin/invoices" match="prefix" className="w-full justify-start gap-2.5">
                <Receipt className="size-4 shrink-0" />
                <span>Invoices</span>
              </PortalNavLink>
              <PortalNavLink href="/admin/payments" match="prefix" className="w-full justify-start gap-2.5">
                <CreditCard className="size-4 shrink-0" />
                <span>Payments</span>
              </PortalNavLink>
              <PortalNavLink href="/admin/accounts" match="prefix" className="w-full justify-start gap-2.5">
                <Wallet className="size-4 shrink-0" />
                <span>Accounts</span>
              </PortalNavLink>
              <PortalNavLink href="/admin/expenses" match="prefix" className="w-full justify-start gap-2.5">
                <DollarSign className="size-4 shrink-0" />
                <span>Expenses</span>
              </PortalNavLink>
              <PortalNavLink href="/admin/activity" match="prefix" className="w-full justify-start gap-2.5">
                <History className="size-4 shrink-0" />
                <span>Audit Logs</span>
              </PortalNavLink>
            </div>
          </div>

          {process.env.NODE_ENV === "development" && (
            <div className="space-y-1.5">
              <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                Developer Tools
              </p>
              <div className="grid gap-1">
                <PortalNavLink href="/admin/style-guide" match="prefix" className="w-full justify-start gap-2.5">
                  <Palette className="size-4 shrink-0" />
                  <span>Style Guide</span>
                </PortalNavLink>
              </div>
            </div>
          )}
        </nav>
      </PortalMobileDrawer>

      {/* Desktop Sidebar Navigation */}
      <aside className="hidden border-r border-border/80 bg-card text-card-foreground md:sticky md:top-0 md:block md:h-dvh md:w-64 md:shrink-0">
        <div className="flex h-full flex-col justify-between p-4">
          <div className="space-y-6">
            <div className="px-2 py-1">
              <Suspense fallback={<PortalBrand variant="admin" brandLogoSrc={null} />}>
                <AdminPortalBrand />
              </Suspense>
            </div>

            <nav className="space-y-5" aria-label="Admin Desktop">
              <div className="space-y-1">
                <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                  Core Workspace
                </p>
                <div className="space-y-0.5">
                  <PortalNavLink href="/admin" match="exact" className="w-full justify-start gap-2.5">
                    <LayoutDashboard className="size-4 shrink-0" />
                    <span>Overview</span>
                  </PortalNavLink>
                  <PortalNavLink href="/admin/users" match="prefix" className="w-full justify-start gap-2.5">
                    <Users className="size-4 shrink-0" />
                    <span>Users</span>
                  </PortalNavLink>
                  <PortalNavLink href="/admin/clients" match="prefix" className="w-full justify-start gap-2.5">
                    <UserCheck className="size-4 shrink-0" />
                    <span>Clients</span>
                  </PortalNavLink>
                  <PortalNavLink href="/admin/projects" match="prefix" className="w-full justify-start gap-2.5">
                    <FolderKanban className="size-4 shrink-0" />
                    <span>Projects</span>
                  </PortalNavLink>
                  <PortalNavLink href="/admin/settings/companies" match="prefix" className="w-full justify-start gap-2.5">
                    <Network className="size-4 shrink-0 text-primary" />
                    <span>Corporate Hierarchy</span>
                  </PortalNavLink>
                  <PortalNavLink href="/admin/settings/company" match="exact" className="w-full justify-start gap-2.5">
                    <Building2 className="size-4 shrink-0" />
                    <span>Company Profile</span>
                  </PortalNavLink>
                </div>
              </div>

              <div className="space-y-1">
                <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                  Finance Operations
                </p>
                <div className="space-y-0.5">
                  <PortalNavLink href="/admin/quotations" match="prefix" className="w-full justify-start gap-2.5">
                    <FileText className="size-4 shrink-0" />
                    <span>Quotations</span>
                  </PortalNavLink>
                  <PortalNavLink href="/admin/purchase-orders" match="prefix" className="w-full justify-start gap-2.5">
                    <ShoppingBag className="size-4 shrink-0" />
                    <span>Purchase Orders</span>
                  </PortalNavLink>
                  <PortalNavLink href="/admin/invoices" match="prefix" className="w-full justify-start gap-2.5">
                    <Receipt className="size-4 shrink-0" />
                    <span>Invoices</span>
                  </PortalNavLink>
                  <PortalNavLink href="/admin/payments" match="prefix" className="w-full justify-start gap-2.5">
                    <CreditCard className="size-4 shrink-0" />
                    <span>Payments</span>
                  </PortalNavLink>
                  <PortalNavLink href="/admin/accounts" match="prefix" className="w-full justify-start gap-2.5">
                    <Wallet className="size-4 shrink-0" />
                    <span>Accounts</span>
                  </PortalNavLink>
                  <PortalNavLink href="/admin/expenses" match="prefix" className="w-full justify-start gap-2.5">
                    <DollarSign className="size-4 shrink-0" />
                    <span>Expenses</span>
                  </PortalNavLink>
                  <PortalNavLink href="/admin/activity" match="prefix" className="w-full justify-start gap-2.5">
                    <History className="size-4 shrink-0" />
                    <span>Audit Logs</span>
                  </PortalNavLink>
                </div>
              </div>

              {process.env.NODE_ENV === "development" && (
                <div className="space-y-1">
                  <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                    Developer
                  </p>
                  <div className="space-y-0.5">
                    <PortalNavLink href="/admin/style-guide" match="prefix" className="w-full justify-start gap-2.5">
                      <Palette className="size-4 shrink-0" />
                      <span>Style Guide</span>
                    </PortalNavLink>
                  </div>
                </div>
              )}
            </nav>
          </div>

          <div className="border-t border-border/80 pt-3">
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
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 py-3">
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

        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-8 sm:py-8">
          <Suspense fallback={<div className="h-64 flex items-center justify-center text-sm text-muted-foreground">Loading workspace...</div>}>
            {children}
          </Suspense>
        </div>
      </PortalShell>
      <CommandPalette />
    </div>
  );
}
