import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/options";
import { PortalBrand } from "@/components/layout/portal-brand";
import { PortalHeader } from "@/components/layout/portal-header";
import { PortalNavLink } from "@/components/layout/portal-nav-link";
import { PortalShell } from "@/components/layout/portal-shell";
import { SignOutButton } from "@/components/portals/sign-out-button";

export default async function AdminPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") redirect("/employee");

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <PortalHeader
        brand={<PortalBrand variant="admin" />}
        endActions={
          <>
            <Link
              href="/employee"
              className="shrink-0 rounded-xl px-3 py-2 text-sm font-medium tracking-tight text-muted-foreground outline-none transition-[transform,background-color,color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px hover:bg-accent/75 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-0 motion-reduce:hover:translate-y-0"
            >
              Workspace
            </Link>
            <SignOutButton className="border-0 bg-transparent hover:bg-destructive/12" />
          </>
        }
      >
        <nav className="portal-admin-nav-unified w-full max-w-full" aria-label="Admin">
          <div className="portal-admin-nav-rows">
            <div className="portal-admin-nav-row">
              <div className="flex min-w-0 flex-nowrap items-center justify-center gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <span className="portal-admin-nav-inline-label">Core</span>
                <PortalNavLink href="/admin" match="exact">
                  Overview
                </PortalNavLink>
                <PortalNavLink href="/admin/users" match="prefix">
                  Users
                </PortalNavLink>
                <PortalNavLink href="/admin/clients" match="prefix">
                  Clients
                </PortalNavLink>
                <PortalNavLink href="/admin/projects" match="prefix">
                  Projects
                </PortalNavLink>
                <PortalNavLink href="/admin/company" match="prefix">
                  Company
                </PortalNavLink>
              </div>
            </div>
            <div className="portal-admin-nav-divider" aria-hidden />
            <div className="portal-admin-nav-row">
              <div className="flex min-w-0 flex-nowrap items-center justify-center gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <span className="portal-admin-nav-inline-label">Finance</span>
                <PortalNavLink href="/admin/quotations" match="prefix">
                  Quotations
                </PortalNavLink>
                <PortalNavLink href="/admin/purchase-orders" match="prefix">
                  POs
                </PortalNavLink>
                <PortalNavLink href="/admin/invoices" match="prefix">
                  Invoices
                </PortalNavLink>
                <PortalNavLink href="/admin/payments" match="prefix">
                  Payments
                </PortalNavLink>
                <PortalNavLink href="/admin/expenses" match="prefix">
                  Expenses
                </PortalNavLink>
                <PortalNavLink href="/admin/activity" match="prefix">
                  Activity Log
                </PortalNavLink>
              </div>
            </div>
          </div>
        </nav>
      </PortalHeader>
      <PortalShell>
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
          {children}
        </div>
      </PortalShell>
    </div>
  );
}
