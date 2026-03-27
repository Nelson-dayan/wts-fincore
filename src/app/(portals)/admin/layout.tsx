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
          className="flex w-full flex-wrap items-center gap-1 sm:w-auto sm:justify-end sm:gap-1.5"
          aria-label="Admin"
        >
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
          <PortalNavLink href="/admin/company" match="prefix">
            Company
          </PortalNavLink>
          <Link
            href="/employee"
            className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/80 hover:text-foreground"
          >
            Workspace
          </Link>
          <SignOutButton />
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
