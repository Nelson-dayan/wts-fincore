import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/options";
import { PortalBrand } from "@/components/layout/portal-brand";
import { PortalNavLink } from "@/components/layout/portal-nav-link";
import { PortalShell } from "@/components/layout/portal-shell";
import { SignOutButton } from "@/components/portals/sign-out-button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { ArrowRightLeft } from "lucide-react";

export default async function AdminPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") redirect("/employee");

  return (
    <div className="flex min-h-dvh flex-col bg-background md:flex-row">
      <aside className="border-b border-border/60 bg-card/70 backdrop-blur md:sticky md:top-0 md:h-dvh md:w-72 md:shrink-0 md:border-r md:border-b-0">
        <div className="flex h-full flex-col gap-5 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3 md:justify-start">
            <PortalBrand variant="admin" />
            <div className="flex items-center gap-2 md:hidden">
              <ThemeToggle />
              <SignOutButton className="border-0 bg-transparent hover:bg-destructive/12" />
            </div>
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
                <PortalNavLink href="/admin/company" match="prefix" className="w-full justify-start">
                  Company
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
                <PortalNavLink href="/admin/expenses" match="prefix" className="w-full justify-start">
                  Expenses
                </PortalNavLink>
                <PortalNavLink href="/admin/activity" match="prefix" className="w-full justify-start">
                  Activity Log
                </PortalNavLink>
              </div>
            </details>
          </nav>

          <div className="mt-auto hidden border-t border-border/60 pt-4 md:block">
            <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card to-muted/40 p-3.5 shadow-[0_14px_36px_-24px_hsl(var(--foreground)/0.35)]">
              <div className="mb-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/85">
                  Workspace
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Switch portal and manage quick controls.
                </p>
              </div>

              <Link
                href="/employee"
                className="group inline-flex w-full items-center justify-between rounded-xl border border-primary/35 bg-gradient-to-r from-primary/16 via-primary/10 to-primary/5 px-3 py-2.5 text-sm font-semibold tracking-tight text-primary outline-none transition-[transform,background-color,color,border-color,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px hover:border-primary/55 hover:from-primary/20 hover:via-primary/14 hover:to-primary/8 hover:shadow-[0_12px_26px_-14px_hsl(var(--primary)/0.85)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-0 motion-reduce:hover:translate-y-0"
              >
                <span className="inline-flex items-center gap-2">
                  <ArrowRightLeft className="size-4 transition-transform duration-200 group-hover:rotate-12" />
                  Go to Employee Portal
                </span>
                <span className="text-base leading-none opacity-80 transition-transform duration-200 group-hover:translate-x-0.5">
                  →
                </span>
              </Link>

              <div className="mt-2.5 grid grid-cols-2 gap-2">
                <div className="flex items-center justify-center rounded-xl border border-border/60 bg-muted/35 px-2 py-1.5">
                  <ThemeToggle />
                </div>
                <div className="flex items-center justify-center rounded-xl border border-border/60 bg-muted/35 px-2 py-1.5">
                  <SignOutButton className="border-0 bg-transparent hover:bg-destructive/12" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <PortalShell>
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
          {children}
        </div>
      </PortalShell>
    </div>
  );
}
