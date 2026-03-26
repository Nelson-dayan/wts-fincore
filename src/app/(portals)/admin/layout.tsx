import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/options";
import { PortalHeader } from "@/components/layout/portal-header";
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
    <div className="flex min-h-dvh flex-col">
      <PortalHeader
        brand={
          <span className="text-sm font-semibold tracking-tight text-primary">
            Admin portal
          </span>
        }
      >
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <Link href="/admin" className="hover:text-foreground">
            Overview
          </Link>
          <Link href="/admin/users" className="hover:text-foreground">
            Users
          </Link>
          <Link href="/employee" className="hover:text-foreground">
            Employee area
          </Link>
          <SignOutButton />
        </nav>
      </PortalHeader>
      <main className="flex-1">{children}</main>
    </div>
  );
}
