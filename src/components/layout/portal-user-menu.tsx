"use client";

import { useEffect, useState, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { 
  User, 
  ChevronDown, 
  LogOut, 
  ShieldCheck, 
  Briefcase, 
  ExternalLink,
  Sparkles,
  Check
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";

export function PortalUserMenu({ portal }: { portal: "admin" | "employee" }) {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const [profileName, setProfileName] = useState<string>("");

  useEffect(() => {
    if (session?.user?.name) {
      setProfileName(session.user.name);
    }
  }, [session?.user?.name]);

  // Listen for real-time profile update events
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

  // Close dropdown on click outside or Escape
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

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

  const roleLabel = (() => {
    if (role === "super_admin") return "Super Admin";
    if (role === "admin") return "Admin";
    return "Staff";
  })();

  const roleBadgeStyle = (() => {
    if (role === "super_admin") return "border-purple-500/40 bg-purple-500/15 text-purple-700 dark:text-purple-300";
    if (role === "admin") return "border-blue-500/40 bg-blue-500/15 text-blue-700 dark:text-blue-300";
    return "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
  })();

  const profileHref = portal === "admin" ? "/admin/profile" : "/employee/profile";

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-1.5 sm:gap-2.5 rounded-full border border-border/80 bg-background/80 py-1 pl-1 pr-1 sm:pr-3 text-sm font-medium transition-all duration-200",
          "hover:border-primary/40 hover:bg-accent/60 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-ring/30",
          open && "border-primary/50 bg-accent ring-2 ring-ring/20"
        )}
        aria-expanded={open}
        aria-haspopup="menu"
        title={`Profile: ${displayName}`}
      >
        <div className="relative">
          <div className="flex size-7.5 items-center justify-center rounded-full bg-gradient-to-tr from-primary to-primary/80 font-bold text-xs text-primary-foreground shadow-sm">
            {initials}
          </div>
          <span className="absolute bottom-0 right-0 size-2 rounded-full bg-emerald-500 ring-2 ring-background" />
        </div>

        <div className="hidden sm:flex flex-col items-start leading-tight text-left">
          <span className="text-xs font-semibold text-foreground max-w-[120px] truncate">
            {displayName}
          </span>
          <span className="text-[10px] text-muted-foreground capitalize">
            {roleLabel}
          </span>
        </div>

        <ChevronDown className={cn("hidden sm:block size-3.5 text-muted-foreground transition-transform duration-200", open && "rotate-180")} />
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div className="absolute right-0 mt-2 w-72 origin-top-right rounded-2xl border border-border/90 bg-card/95 p-2 shadow-2xl backdrop-blur-md z-50 animate-in fade-in zoom-in-95 duration-150">
          {/* User Identity Header */}
          <div className="rounded-xl bg-muted/50 p-3 mb-1.5 border border-border/50">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-primary/70 font-bold text-sm text-primary-foreground shadow-md ring-2 ring-background shrink-0">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                    <ShieldCheck className="size-3" />
                    This is you
                  </span>
                </div>
                <p className="text-sm font-semibold text-foreground truncate mt-0.5" title={displayName}>
                  {displayName}
                </p>
                <p className="text-xs text-muted-foreground truncate" title={email}>
                  {email}
                </p>
              </div>
            </div>

            <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-border/50 text-[11px]">
              <span className="text-muted-foreground font-medium">Assigned Tier:</span>
              <Badge variant="outline" className={cn("px-2 py-0 text-[10px]", roleBadgeStyle)}>
                {roleLabel}
              </Badge>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="space-y-0.5 py-1">
            <Link
              href={profileHref}
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs sm:text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <User className="size-4 text-primary shrink-0" />
              <span>My Profile & Settings</span>
            </Link>

            {portal === "admin" ? (
              <Link
                href="/employee"
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs sm:text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <Briefcase className="size-4 shrink-0" />
                <span>Employee Portal View</span>
                <ExternalLink className="size-3 ml-auto opacity-60" />
              </Link>
            ) : role === "admin" || role === "super_admin" ? (
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs sm:text-sm font-medium text-primary transition-colors hover:bg-primary/10"
              >
                <ShieldCheck className="size-4 shrink-0" />
                <span>Switch to Admin Portal</span>
                <ExternalLink className="size-3 ml-auto opacity-60" />
              </Link>
            ) : null}
          </div>

          <div className="border-t border-border/70 my-1" />

          {/* Sign Out Button */}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              signOut({ callbackUrl: window.location.origin + "/login" });
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs sm:text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
          >
            <LogOut className="size-4 shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
}
