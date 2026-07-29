"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { User } from "lucide-react";

export function PortalUserBadge() {
  const { data: session } = useSession();
  if (!session?.user) return null;

  return (
    <div className="space-y-3 border-t border-border/60 pt-4">
      <span className="inline-flex w-full items-center gap-2 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground ring-1 ring-border/60 sm:text-sm">
        <User className="size-3.5 shrink-0 opacity-70" aria-hidden />
        <span className="truncate" title={session.user.email ?? undefined}>
          {session.user.email}
        </span>
      </span>
      {session.user.role === "admin" ? (
        <Link
          href="/admin"
          className="inline-flex rounded-xl px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
        >
          Admin Portal
        </Link>
      ) : null}
    </div>
  );
}
