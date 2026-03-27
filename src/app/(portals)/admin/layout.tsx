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
      <PortalHeader brand={<PortalBrand variant="admin" />}>
        <nav
          className="flex w-full flex-col gap-1 sm:w-auto sm:items-end"
          aria-label="Admin"
        >
          <div className="flex w-full flex-wrap items-center gap-1.5 sm:justify-end">
            <span className="mr-0.5 rounded-full bg-muted/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground ring-1 ring-border/60">
              Core
            </span>
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
          <div className="flex w-full flex-wrap items-center gap-1.5 sm:justify-end">
            <span className="mr-0.5 rounded-full bg-muted/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground ring-1 ring-border/60">
              Finance
            </span>
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
              Activity
            </PortalNavLink>
            <Link
              href="/employee"
              className="rounded-lg px-3 py-2 text-[0.8125rem] font-medium text-muted-foreground transition-[color,background-color,box-shadow] duration-200 hover:bg-accent/80 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Workspace
            </Link>
            <SignOutButton />
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
