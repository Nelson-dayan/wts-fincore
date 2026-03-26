import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/options";
import { PortalHeader } from "@/components/layout/portal-header";
import { SignOutButton } from "@/components/portals/sign-out-button";

export default async function EmployeePortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  return (
    <div className="flex min-h-dvh flex-col">
      <PortalHeader
        brand={
          <span className="text-sm font-semibold tracking-tight">
            Employee portal
          </span>
        }
      >
        <span className="hidden max-w-[40vw] truncate text-sm text-muted-foreground sm:inline md:max-w-xs">
          {session.user.email}
        </span>
        {session.user.role === "admin" ? (
          <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground">
            Admin
          </Link>
        ) : null}
        <SignOutButton />
      </PortalHeader>
      <main className="flex-1">{children}</main>
    </div>
  );
}
