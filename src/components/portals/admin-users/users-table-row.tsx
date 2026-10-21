"use client";

import { Building2, Crown, KeyRound, Layers, Loader2, Pencil, Shield, ShieldAlert, ShieldCheck, Trash2, UserCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { AdminUser } from "./types";
import type { CompanyOption } from "@/components/companies/company-switcher";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function RoleBadge({ role }: { role: string }) {
  if (role === "super_admin") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/35 bg-gradient-to-r from-amber-500/15 via-amber-400/10 to-yellow-500/20 px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400 shadow-xs">
        <Crown className="size-3 text-amber-500" />
        Super Admin
      </span>
    );
  }

  if (role === "admin") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
        <Shield className="size-3 text-primary" />
        Admin
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      Employee
    </span>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={
        active
          ? "inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300"
          : "inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground"
      }
    >
      <span
        className={`size-1.5 rounded-full ${active ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" : "bg-muted-foreground/50"}`}
        aria-hidden
      />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

type UsersTableRowProps = {
  user: AdminUser;
  companies?: CompanyOption[];
  isCallerSuperAdmin?: boolean;
  currentUserId?: string;
  editingId: string | null;
  savingId: string;
  draft?: Partial<AdminUser>;
  onDraftChange: (userId: string, patch: Partial<AdminUser>) => void;
  onSave: (userId: string) => void;
  onCancelEdit: () => void;
  onStartEdit: (user: AdminUser) => void;
  onOpenAccessModal?: (user: AdminUser) => void;
  onDelete: (userId: string) => void;
  onResetPassword?: (user: AdminUser) => void;
  onReactivate?: (user: AdminUser) => void;
};

export function UsersTableRow({
  user,
  companies = [],
  isCallerSuperAdmin = false,
  currentUserId,
  editingId,
  savingId,
  draft,
  onDraftChange,
  onSave,
  onCancelEdit,
  onStartEdit,
  onOpenAccessModal,
  onDelete,
  onResetPassword,
  onReactivate,
}: UsersTableRowProps) {
  const isProtectedAccount =
    (user.role === "super_admin" || (user.role === "admin" && user._id !== currentUserId)) &&
    !isCallerSuperAdmin;
  const isEditing = !isProtectedAccount && editingId === user._id;

  // Resolve assigned company badges
  const assignedCompanies = companies.filter((c) => (user.companyIds || []).includes(c._id));

  return (
    <tr className="bg-card transition-colors hover:bg-muted/35 dark:hover:bg-muted/20 border-b border-border/40">
      {/* User Identity */}
      <td className="px-5 py-3.5 pr-3">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-primary/20 to-primary/5 text-xs font-bold text-primary ring-1 ring-primary/15">
            {initials(draft?.name ?? user.name)}
          </span>
          <div className="min-w-0">
            {isEditing ? (
              <Input
                value={draft?.name ?? user.name ?? ""}
                onChange={(e) => onDraftChange(user._id, { name: e.target.value })}
                className="h-9 max-w-50 text-sm font-medium"
              />
            ) : (
              <p className="truncate font-semibold text-foreground">{user.name}</p>
            )}
            <p className="truncate text-xs text-muted-foreground">ID · {user._id.slice(-8)}</p>
          </div>
        </div>
      </td>

      {/* Email */}
      <td className="max-w-50 truncate px-0 py-3.5 pr-3 text-muted-foreground">{user.email}</td>

      {/* Role */}
      <td className="px-0 py-3.5 pr-3 align-middle">
        <RoleBadge role={user.role} />
      </td>

      {/* Operating Companies & Group Access */}
      <td className="px-0 py-3.5 pr-3 align-middle">
        <div className="flex flex-wrap items-center gap-1.5 max-w-60">
          {user.role === "super_admin" ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
              <Crown className="size-3" /> ALL (Global Access)
            </span>
          ) : assignedCompanies.length > 0 ? (
            assignedCompanies.map((c) => (
              <span
                key={c._id}
                title={c.name}
                className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-muted/60 px-2 py-0.5 text-[10px] font-mono font-semibold text-foreground"
              >
                <Building2 className="size-3 text-primary" />
                {c.code}
              </span>
            ))
          ) : (
            <span className="text-[11px] text-muted-foreground italic">No companies assigned</span>
          )}

          {user.groupViewAccess && (
            <span
              title="Group View Active — Consolidates descendant sub-entities"
              className="inline-flex items-center gap-1 rounded-md border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-600 dark:text-indigo-300"
            >
              <Layers className="size-3" /> Group View
            </span>
          )}
        </div>
      </td>

      {/* Status */}
      <td className="px-0 py-3.5 pr-3 align-middle">
        {isEditing ? (
          <Select
            value={String(draft?.isActive ?? user.isActive)}
            className="h-9 max-w-35 text-sm"
            onChange={(e) => onDraftChange(user._id, { isActive: e.target.value === "true" })}
            options={[
              { value: "true", label: "Active" },
              { value: "false", label: "Inactive" },
            ]}
          />
        ) : (
          <StatusBadge active={user.isActive} />
        )}
      </td>

      {/* Phone */}
      <td className="px-0 py-3.5 pr-3 text-muted-foreground">
        {isEditing ? (
          <Input
            value={draft?.phone ?? user.phone ?? ""}
            onChange={(e) => onDraftChange(user._id, { phone: e.target.value })}
            className="h-9 max-w-35 text-sm"
          />
        ) : (
          <span className="tabular-nums">{user.phone || "—"}</span>
        )}
      </td>

      {/* Actions */}
      <td className="px-0 py-3.5 pr-5 text-right">
        <div className="flex justify-end gap-1.5">
          {isProtectedAccount ? (
            <span
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/35 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400 select-none shadow-2xs"
              title={`Protected Account: ${user.role === "super_admin" ? "Super Admin" : "Admin"} accounts can only be managed by a Super Admin.`}
            >
              <ShieldAlert className="size-3.5 text-amber-500" />
              Protected
            </span>
          ) : isEditing ? (
            <>
              <Button size="sm" className="rounded-lg px-3" onClick={() => onSave(user._id)} disabled={savingId === user._id}>
                {savingId === user._id ? (
                  <>
                    <Loader2 className="mr-1.5 size-3.5 animate-spin" aria-hidden />
                    Save
                  </>
                ) : (
                  "Save"
                )}
              </Button>
              <Button size="sm" variant="outline" className="rounded-lg px-2.5" onClick={onCancelEdit}>
                <X className="size-4" aria-label="Cancel edit" />
              </Button>
            </>
          ) : (
            <>
              {!isProtectedAccount && onOpenAccessModal && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-2.5 rounded-lg text-xs font-semibold gap-1 text-primary border-primary/30 hover:bg-primary/10"
                  onClick={() => onOpenAccessModal(user)}
                  title="Edit permissions and company assignments"
                >
                  <UserCheck className="size-3.5" />
                  Access
                </Button>
              )}
              {!isProtectedAccount && (
                <Button size="sm" variant="outline" className="h-8 w-8 rounded-lg p-0" onClick={() => onStartEdit(user)} title="Edit user profile" aria-label="Edit user profile">
                  <Pencil className="size-3.5" aria-hidden />
                </Button>
              )}
              {!isProtectedAccount && onResetPassword && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 rounded-lg p-0 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                  onClick={() => onResetPassword(user)}
                  title="Reset user password"
                  aria-label="Reset user password"
                >
                  <KeyRound className="size-3.5" aria-hidden />
                </Button>
              )}
              {!user.isActive && onReactivate && !isProtectedAccount && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-2 rounded-lg text-xs font-semibold gap-1 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                  onClick={() => onReactivate(user)}
                  title="Reactivate user account"
                  aria-label="Reactivate user account"
                >
                  <UserCheck className="size-3.5" />
                  Reactivate
                </Button>
              )}
              <Button
                size="sm"
                variant={user.isActive ? "destructive" : "outline"}
                className={`h-8 w-8 rounded-lg p-0 ${!user.isActive ? "text-muted-foreground border-border/40 opacity-50 cursor-not-allowed" : ""}`}
                onClick={() => user.isActive && onDelete(user._id)}
                disabled={savingId === user._id || user._id === currentUserId || isProtectedAccount || !user.isActive}
                title={
                  user._id === currentUserId
                    ? "You cannot deactivate your own account"
                    : isProtectedAccount
                    ? "Only a Super Admin can manage this account"
                    : !user.isActive
                    ? "Account is already deactivated"
                    : "Deactivate account (Safe Soft Delete)"
                }
                aria-label={user.isActive ? "Deactivate user" : "User deactivated"}
              >
                <Trash2 className="size-3.5" aria-hidden />
              </Button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}
