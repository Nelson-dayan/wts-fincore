"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Building2,
  Check,
  Crown,
  Layers,
  Loader2,
  Network,
  Shield,
  ShieldAlert,
  UserCheck,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { AdminUser } from "./types";
import type { CompanyOption } from "@/components/companies/company-switcher";

export function EditUserAccessModal({
  user,
  companies = [],
  isCallerSuperAdmin = false,
  onClose,
  onSaveComplete,
}: {
  user: AdminUser | null;
  companies: CompanyOption[];
  isCallerSuperAdmin?: boolean;
  onClose: () => void;
  onSaveComplete: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [role, setRole] = useState<"admin" | "employee" | "super_admin">("employee");
  const [companyIds, setCompanyIds] = useState<string[]>([]);
  const [groupViewAccess, setGroupViewAccess] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (user) {
      setRole(user.role || "employee");
      setCompanyIds(user.companyIds || []);
      setGroupViewAccess(Boolean(user.groupViewAccess));
      setIsActive(user.isActive !== false);
    }
  }, [user]);

  if (!user || !mounted) return null;

  const isTargetProtected = (user.role === "super_admin" || user.role === "admin") && !isCallerSuperAdmin;

  const toggleCompanyId = (id: string) => {
    if (isTargetProtected) return;
    setCompanyIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isTargetProtected) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/users/${user._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          companyIds,
          groupViewAccess,
          isActive,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to update user permissions");
      }

      onSaveComplete();
    } catch (err: any) {
      setError(err.message || "Failed to update permissions");
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close dialog"
        disabled={loading}
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity dark:bg-black/70"
        onClick={() => !loading && onClose()}
      />

      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-border/80 bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
              <UserCheck className="size-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Edit User Access & Permissions</h3>
              <p className="text-xs text-muted-foreground">{user.name} ({user.email})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        {(user.role === "super_admin" || user.role === "admin") && !isCallerSuperAdmin && (
          <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
            <ShieldAlert className="size-4 shrink-0 text-amber-500" />
            <span>
              <strong>Protected Account:</strong> This user holds {user.role === "super_admin" ? "Super Administrator" : "Administrator"} privileges. Only a Super Administrator can modify this account&apos;s permissions, operating scope, or status.
            </span>
          </div>
        )}

        <form onSubmit={handleSave} className="mt-4 space-y-5">
          {/* System Role */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Shield className="size-3.5 text-primary" /> System Privilege Role
            </Label>
            <Select
              value={role}
              disabled={!isCallerSuperAdmin}
              className="h-10 text-xs font-medium disabled:opacity-80"
              onChange={(e) => setRole(e.target.value as "admin" | "employee" | "super_admin")}
              options={
                isCallerSuperAdmin
                  ? [
                      { value: "employee", label: "Employee — Access to assigned projects & Quotations" },
                      { value: "admin", label: "Admin — Full Management within assigned companies" },
                      { value: "super_admin", label: "Super Admin — Global System Access across ALL Companies & Groups" },
                    ]
                  : [
                      { value: "employee", label: "Employee — Access to assigned projects & Quotations" },
                      ...(user.role === "admin" ? [{ value: "admin", label: "Admin (Protected — Super Admin Managed)" }] : []),
                      ...(user.role === "super_admin" ? [{ value: "super_admin", label: "Super Admin (Protected)" }] : []),
                    ]
              }
            />
            {!isCallerSuperAdmin && (
              <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
                <ShieldAlert className="size-3 text-amber-500" />
                Only Super Admins can promote users or assign administrative roles.
              </p>
            )}
            {role === "super_admin" && (
              <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-600 dark:text-amber-400">
                <Crown className="size-4 shrink-0 text-amber-500" />
                <span>
                  <strong>Super Admin Active:</strong> Bypasses company boundaries with full global access.
                </span>
              </div>
            )}
          </div>

          {/* Company Assignments */}
          <div className="space-y-2.5 rounded-xl border border-border/60 bg-muted/20 p-3.5">
            <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Building2 className="size-4 text-primary" />
              Assigned Operating Companies
            </Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {companies.map((comp) => {
                const isChecked = companyIds.includes(comp._id);
                const isLocked = isTargetProtected;
                return (
                  <label
                    key={comp._id}
                    className={`flex items-center justify-between rounded-xl border p-2.5 text-xs transition-all ${
                      isLocked ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                    } ${
                      isChecked
                        ? "border-primary/50 bg-primary/10 text-primary font-semibold"
                        : "border-border/60 bg-background/50 text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`size-4 rounded border flex items-center justify-center ${
                          isChecked ? "bg-primary border-primary text-primary-foreground" : "border-border"
                        }`}
                      >
                        {isChecked && <Check className="size-3 stroke-[3]" />}
                      </div>
                      <div className="truncate">
                        <div className="truncate font-medium">{comp.name}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">[{comp.code}]</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      disabled={isLocked}
                      className="sr-only"
                      checked={isChecked}
                      onChange={() => toggleCompanyId(comp._id)}
                    />
                  </label>
                );
              })}
            </div>
          </div>

          {/* Group View Toggle */}
          <div className="space-y-2 rounded-xl border border-border/60 bg-muted/20 p-3.5">
            <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Network className="size-4 text-indigo-500" />
              Group View Permissions
            </Label>
            <label className={`flex items-start gap-3 rounded-xl border border-border/60 bg-background/50 p-3 ${
              isTargetProtected ? "cursor-not-allowed opacity-60" : "cursor-pointer"
            }`}>
              <input
                type="checkbox"
                disabled={isTargetProtected}
                className="mt-0.5 size-4 rounded border-border text-primary focus:ring-primary"
                checked={groupViewAccess}
                onChange={(e) => setGroupViewAccess(e.target.checked)}
              />
              <div className="space-y-0.5 text-xs">
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  <Layers className="size-3.5 text-primary" />
                  Enable Group View Access (`groupViewAccess`)
                </div>
                <div className="text-muted-foreground text-[11px]">
                  Grants consolidated visibility to view data across descendant sub-companies within authorized group hierarchies.
                </div>
              </div>
            </label>
          </div>

          {/* Account Status */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground">Account Status</Label>
            <Select
              value={String(isActive)}
              disabled={isTargetProtected}
              className="h-9 text-xs font-medium"
              onChange={(e) => setIsActive(e.target.value === "true")}
              options={[
                { value: "true", label: "Active — User can sign in" },
                { value: "false", label: "Inactive — Account locked" },
              ]}
            />
          </div>

          {error && (
            <p className="rounded-lg border border-destructive/25 bg-destructive/10 p-2.5 text-xs text-destructive">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 border-t border-border/60 pt-4">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading || isTargetProtected}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" /> Saving…
                </>
              ) : (
                "Save Permissions"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
