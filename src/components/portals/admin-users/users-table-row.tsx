"use client";

import { KeyRound, Loader2, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { AdminUser } from "./types";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function RoleBadge({ role }: { role: string }) {
  const isAdmin = role === "admin";
  return (
    <span
      className={
        isAdmin
          ? "inline-flex items-center rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary"
          : "inline-flex items-center rounded-full border border-border bg-muted/60 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
      }
    >
      {role}
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
  editingId: string | null;
  savingId: string;
  draft?: Partial<AdminUser>;
  onDraftChange: (userId: string, patch: Partial<AdminUser>) => void;
  onSave: (userId: string) => void;
  onCancelEdit: () => void;
  onStartEdit: (user: AdminUser) => void;
  onDelete: (userId: string) => void;
  onResetPassword?: (user: AdminUser) => void;
};

export function UsersTableRow({
  user,
  editingId,
  savingId,
  draft,
  onDraftChange,
  onSave,
  onCancelEdit,
  onStartEdit,
  onDelete,
  onResetPassword,
}: UsersTableRowProps) {
  const isEditing = editingId === user._id;

  return (
    <tr className="bg-card transition-colors hover:bg-muted/35 dark:hover:bg-muted/20">
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
      <td className="max-w-50 truncate px-0 py-3.5 pr-3 text-muted-foreground">{user.email}</td>
      <td className="px-0 py-3.5 pr-3 align-middle">
        {isEditing ? (
          <Select
            value={draft?.role ?? user.role}
            className="h-9 max-w-40 text-sm"
            onChange={(e) => onDraftChange(user._id, { role: e.target.value as "admin" | "employee" })}
            options={[
              { value: "admin", label: "Admin" },
              { value: "employee", label: "Employee" },
            ]}
          />
        ) : (
          <RoleBadge role={user.role} />
        )}
      </td>
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
      <td className="whitespace-nowrap px-0 py-3.5 pr-3 text-muted-foreground tabular-nums">
        {new Date(user.createdAt).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        })}
      </td>
      <td className="px-0 py-3.5 pr-5 text-right">
        <div className="flex justify-end gap-1.5">
          {isEditing ? (
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
              <Button size="sm" variant="outline" className="h-8 w-8 rounded-lg p-0" onClick={() => onStartEdit(user)} title="Edit user" aria-label="Edit user">
                <Pencil className="size-3.5" aria-hidden />
              </Button>
              {onResetPassword && (
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
              <Button
                size="sm"
                variant="destructive"
                className="h-8 w-8 rounded-lg p-0"
                onClick={() => onDelete(user._id)}
                disabled={savingId === user._id}
                title="Delete user"
                aria-label="Delete user"
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
