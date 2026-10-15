"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { User, ShieldCheck, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function PortalUserBadge({ portal = "employee" }: { portal?: "admin" | "employee" }) {
  const { data: session } = useSession();
  const [profileName, setProfileName] = useState<string>("");

  useEffect(() => {
    if (session?.user?.name) {
      setProfileName(session.user.name);
    }
  }, [session?.user?.name]);

  useEffect(() => {
    const handleProfileUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ name?: string }>;
      if (customEvent.detail?.name) {
        setProfileName(customEvent.detail.name);
      }
    };

    window.addEventListener("wts-user-profile-updated", handleProfileUpdate);
    return () => {
      window.removeEventListener("wts-user-profile-updated", handleProfileUpdate);
    };
  }, []);

  if (!session?.user) return null;

  const displayName = profileName || session.user.name || session.user.email?.split("@")[0] || "User";
  const email = session.user.email || "";
  const role = session.user.role || "employee";

  const initials = (() => {
    const parts = displayName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return displayName.slice(0, 2).toUpperCase();
  })();

  const profileHref = portal === "admin" ? "/admin/profile" : "/employee/profile";

  return (
    <div className="space-y-2 border-t border-border/70 pt-3">
      {/* Clickable Profile Card */}
      <Link
        href={profileHref}
        className="group flex w-full items-center gap-3 rounded-xl border border-border/60 bg-card/60 p-2.5 text-left transition-all duration-200 hover:border-primary/40 hover:bg-accent/50 hover:shadow-sm"
        title="View and update your personal profile"
      >
        <div className="relative shrink-0">
          <div className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-tr from-primary to-primary/80 font-bold text-xs text-primary-foreground shadow-sm">
            {initials}
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
            {displayName}
          </p>
          <p className="text-[11px] text-muted-foreground truncate" title={email}>
            {email}
          </p>
        </div>

        <ChevronRight className="size-4 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground shrink-0" />
      </Link>

      {/* Admin Switcher for Employees with Admin privileges */}
      {portal === "employee" && (role === "admin" || role === "super_admin") ? (
        <Link
          href="/admin"
          className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
        >
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="size-3.5" />
            Switch to Admin Portal
          </span>
          <ChevronRight className="size-3 opacity-60" />
        </Link>
      ) : null}
    </div>
  );
}
