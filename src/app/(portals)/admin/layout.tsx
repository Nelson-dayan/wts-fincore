import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/options";
import { PortalBrand } from "@/components/layout/portal-brand";
import { PortalHeader } from "@/components/layout/portal-header";
import { PortalNavLink } from "@/components/layout/portal-nav-link";
import { PortalShell } from "@/components/layout/portal-shell";
import { SignOutButton } from "@/components/portals/sign-out-button";
import { cn } from "@/lib/utils/cn";

const navGroupClass = cn(
  "inline-flex w-max max-w-[calc(100vw-2rem)] flex-wrap items-center gap-1 rounded-2xl p-1",
  "border border-border/50 bg-muted/35 shadow-[0_1px_0_hsl(var(--border)/0.35)]",
  "dark:border-white/[0.07] dark:bg-white/[0.04] dark:shadow-[inset_0_1px_0_hsl(0_0%_100%/0.04)]"
);

const sectionLabelClass = cn(
  "mr-0.5 select-none rounded-full px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/90",
  "ring-1 ring-border/45 dark:text-muted-foreground dark:ring-white/[0.08]"
);

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
        actions={
          <>
            <Link
              href="/employee"
              className={cn(
                "inline-flex h-9 shrink-0 items-center justify-center rounded-full px-3.5 text-[0.8125rem] font-medium",
                "text-muted-foreground transition-[color,background-color,box-shadow,transform] duration-200 ease-out",
                "hover:bg-muted/90 hover:text-foreground active:scale-[0.98]",
                "dark:hover:bg-white/[0.07]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              )}
            >
              Workspace
            </Link>
            <SignOutButton />
          </>
        }
      >
        <nav className="flex w-max flex-col items-stretch gap-2 sm:items-start lg:mx-auto lg:items-center" aria-label="Admin">
          <div className={navGroupClass}>
            <span className={sectionLabelClass}>Core</span>
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
          <div className={navGroupClass}>
            <span className={sectionLabelClass}>Finance</span>
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
