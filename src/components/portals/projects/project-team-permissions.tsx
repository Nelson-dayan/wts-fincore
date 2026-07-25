"use client";

import { useState } from "react";
import { 
  Users, 
  ShieldCheck, 
  UserPlus, 
  Check, 
  X, 
  Settings2, 
  FileText, 
  ShoppingBag, 
  Receipt, 
  Wallet,
  Folder,
  Trash2
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface ModulePerms {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

export interface MemberPermissions {
  quotations: ModulePerms;
  purchaseOrders: ModulePerms;
  invoices: ModulePerms;
  expenses: ModulePerms;
  projectDetails: { view: boolean; edit: boolean };
}

export interface AssignedMember {
  userId: {
    _id: string;
    name: string;
    email: string;
    role: string;
  } | string;
  rolePreset?: "manager" | "editor" | "viewer" | "custom";
  permissions: MemberPermissions;
}

const DEFAULT_PERMISSIONS: MemberPermissions = {
  quotations: { view: true, create: false, edit: false, delete: false },
  purchaseOrders: { view: true, create: false, edit: false, delete: false },
  invoices: { view: true, create: false, edit: false, delete: false },
  expenses: { view: true, create: false, edit: false, delete: false },
  projectDetails: { view: true, edit: false },
};

const PRESETS = {
  manager: {
    label: "Project Manager (Full Access)",
    perms: {
      quotations: { view: true, create: true, edit: true, delete: true },
      purchaseOrders: { view: true, create: true, edit: true, delete: true },
      invoices: { view: true, create: true, edit: true, delete: true },
      expenses: { view: true, create: true, edit: true, delete: true },
      projectDetails: { view: true, edit: true },
    }
  },
  editor: {
    label: "Finance Contributor (Create & Edit)",
    perms: {
      quotations: { view: true, create: true, edit: true, delete: false },
      purchaseOrders: { view: true, create: true, edit: true, delete: false },
      invoices: { view: true, create: true, edit: true, delete: false },
      expenses: { view: true, create: true, edit: true, delete: false },
      projectDetails: { view: true, edit: true },
    }
  },
  viewer: {
    label: "View-Only Auditor (Read-Only)",
    perms: {
      quotations: { view: true, create: false, edit: false, delete: false },
      purchaseOrders: { view: true, create: false, edit: false, delete: false },
      invoices: { view: true, create: false, edit: false, delete: false },
      expenses: { view: true, create: false, edit: false, delete: false },
      projectDetails: { view: true, edit: false },
    }
  }
};

export function ProjectTeamPermissions({
  projectId,
  initialMembers = [],
  allUsers = [],
  onUpdate,
}: {
  projectId: string;
  initialMembers: any[];
  allUsers: Array<{ _id: string; name: string; email: string; role: string }>;
  onUpdate?: () => void;
}) {
  const [members, setMembers] = useState<AssignedMember[]>(() => {
    return initialMembers.map((m) => ({
      userId: m.userId,
      rolePreset: m.rolePreset || "custom",
      permissions: m.permissions || DEFAULT_PERMISSIONS,
    }));
  });

  const [editingMember, setEditingMember] = useState<AssignedMember | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleOpenAddModal = (user: { _id: string; name: string; email: string; role: string }) => {
    setSelectedUserId(user._id);
    setEditingMember({
      userId: user,
      rolePreset: "editor",
      permissions: PRESETS.editor.perms,
    });
  };

  const handleApplyPreset = (presetKey: "manager" | "editor" | "viewer") => {
    if (!editingMember) return;
    setEditingMember({
      ...editingMember,
      rolePreset: presetKey,
      permissions: PRESETS[presetKey].perms,
    });
  };

  const handleTogglePerm = (
    module: keyof MemberPermissions,
    action: "view" | "create" | "edit" | "delete"
  ) => {
    if (!editingMember) return;
    const currentModule = editingMember.permissions[module] as any;
    const updatedModule = {
      ...currentModule,
      [action]: !currentModule[action],
    };

    setEditingMember({
      ...editingMember,
      rolePreset: "custom",
      permissions: {
        ...editingMember.permissions,
        [module]: updatedModule,
      },
    });
  };

  const handleSaveMember = async () => {
    if (!editingMember) return;
    const uid = typeof editingMember.userId === "object" ? editingMember.userId._id : editingMember.userId;

    const updatedList = members.filter((m) => {
      const id = typeof m.userId === "object" ? m.userId._id : m.userId;
      return id !== uid;
    });

    updatedList.push(editingMember);

    setIsSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const payloadMembers = updatedList.map((m) => ({
        userId: typeof m.userId === "object" ? m.userId._id : m.userId,
        rolePreset: m.rolePreset,
        permissions: m.permissions,
      }));

      const res = await fetch(`/api/admin/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedMembers: payloadMembers }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to update permissions");
      }

      setMembers(updatedList);
      setEditingMember(null);
      setSuccessMsg("Team member permissions updated successfully!");
      if (onUpdate) onUpdate();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save permissions");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveMember = async (uid: string) => {
    const updatedList = members.filter((m) => {
      const id = typeof m.userId === "object" ? m.userId._id : m.userId;
      return id !== uid;
    });

    setIsSaving(true);
    try {
      const payloadMembers = updatedList.map((m) => ({
        userId: typeof m.userId === "object" ? m.userId._id : m.userId,
        rolePreset: m.rolePreset,
        permissions: m.permissions,
      }));

      const res = await fetch(`/api/admin/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedMembers: payloadMembers }),
      });

      if (!res.ok) throw new Error("Failed to remove member");
      setMembers(updatedList);
      if (onUpdate) onUpdate();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to remove member");
    } finally {
      setIsSaving(false);
    }
  };

  const assignedUserIds = new Set(
    members.map((m) => (typeof m.userId === "object" ? m.userId._id : m.userId))
  );

  const availableEmployees = allUsers.filter((u) => !assignedUserIds.has(u._id));

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h3 className="text-base font-bold text-foreground">Project Team & Permissions</h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Configure granular per-module access (View, Create, Edit, Delete) for assigned employees.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs font-medium text-rose-600 dark:text-rose-400">
          {errorMsg}
        </div>
      )}

      {/* Member List */}
      <div className="mt-6 space-y-3">
        {members.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
            No employees assigned to this project yet. Assign an employee below to set permissions.
          </div>
        ) : (
          members.map((m) => {
            const userObj = typeof m.userId === "object" ? m.userId : allUsers.find((u) => u._id === m.userId);
            const uid = typeof m.userId === "object" ? m.userId._id : m.userId;
            const perms = m.permissions || DEFAULT_PERMISSIONS;

            return (
              <div
                key={uid}
                className="flex flex-col gap-3 rounded-xl border border-border/60 bg-muted/30 p-4 transition-all hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {userObj?.name?.charAt(0).toUpperCase() || "E"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{userObj?.name || "Employee"}</span>
                      <span className="rounded-md bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {m.rolePreset || "Custom"}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">{userObj?.email}</span>
                  </div>
                </div>

                {/* Module Badges */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={cn(
                    "rounded-md px-2 py-1 text-[11px] font-medium border",
                    perms.quotations?.edit || perms.quotations?.create 
                      ? "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400" 
                      : perms.quotations?.view ? "bg-muted border-border text-muted-foreground" : "bg-rose-500/10 border-rose-500/20 text-rose-500"
                  )}>
                    Quotations: {perms.quotations?.delete ? "Full" : perms.quotations?.edit ? "Edit" : perms.quotations?.create ? "Add" : perms.quotations?.view ? "View" : "None"}
                  </span>

                  <span className={cn(
                    "rounded-md px-2 py-1 text-[11px] font-medium border",
                    perms.purchaseOrders?.edit || perms.purchaseOrders?.create 
                      ? "bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400" 
                      : perms.purchaseOrders?.view ? "bg-muted border-border text-muted-foreground" : "bg-rose-500/10 border-rose-500/20 text-rose-500"
                  )}>
                    POs: {perms.purchaseOrders?.delete ? "Full" : perms.purchaseOrders?.edit ? "Edit" : perms.purchaseOrders?.create ? "Add" : perms.purchaseOrders?.view ? "View" : "None"}
                  </span>

                  <span className={cn(
                    "rounded-md px-2 py-1 text-[11px] font-medium border",
                    perms.invoices?.edit || perms.invoices?.create 
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400" 
                      : perms.invoices?.view ? "bg-muted border-border text-muted-foreground" : "bg-rose-500/10 border-rose-500/20 text-rose-500"
                  )}>
                    Invoices: {perms.invoices?.delete ? "Full" : perms.invoices?.edit ? "Edit" : perms.invoices?.create ? "Add" : perms.invoices?.view ? "View" : "None"}
                  </span>

                  <span className={cn(
                    "rounded-md px-2 py-1 text-[11px] font-medium border",
                    perms.expenses?.edit || perms.expenses?.create 
                      ? "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400" 
                      : perms.expenses?.view ? "bg-muted border-border text-muted-foreground" : "bg-rose-500/10 border-rose-500/20 text-rose-500"
                  )}>
                    Expenses: {perms.expenses?.delete ? "Full" : perms.expenses?.edit ? "Edit" : perms.expenses?.create ? "Add" : perms.expenses?.view ? "View" : "None"}
                  </span>

                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={() => setEditingMember(m)}
                      className="rounded-lg border border-border/80 bg-card p-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                      title="Edit Permissions"
                    >
                      <Settings2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleRemoveMember(uid)}
                      disabled={isSaving}
                      className="rounded-lg border border-border/80 bg-card p-1.5 text-xs text-rose-500 hover:bg-rose-500/10"
                      title="Remove Member"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add New Member Picker */}
      {availableEmployees.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
          <span className="text-xs font-semibold text-muted-foreground">Assign Employee:</span>
          {availableEmployees.map((user) => (
            <button
              key={user._id}
              onClick={() => handleOpenAddModal(user)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:border-primary hover:bg-primary/5 transition-all"
            >
              <UserPlus className="h-3.5 w-3.5 text-primary" />
              {user.name}
            </button>
          ))}
        </div>
      )}

      {/* Permission Modal / Drawer */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <div>
                <h4 className="text-lg font-bold text-foreground">
                  Configure Permissions: {typeof editingMember.userId === "object" ? editingMember.userId.name : "Employee"}
                </h4>
                <p className="text-xs text-muted-foreground">
                  Select a quick role preset or customize module-level capabilities.
                </p>
              </div>
              <button
                onClick={() => setEditingMember(null)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Role Presets */}
            <div className="mt-4 space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Quick Role Presets</label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {(Object.keys(PRESETS) as Array<keyof typeof PRESETS>).map((key) => {
                  const isSelected = editingMember.rolePreset === key;
                  return (
                    <button
                      key={key}
                      onClick={() => handleApplyPreset(key)}
                      className={cn(
                        "rounded-xl border p-3 text-left transition-all",
                        isSelected
                          ? "border-primary bg-primary/10 text-primary shadow-xs"
                          : "border-border/70 bg-muted/20 text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                    >
                      <div className="text-xs font-bold">{key.toUpperCase()}</div>
                      <div className="mt-1 text-[11px] leading-tight opacity-80">{PRESETS[key].label}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Matrix Table */}
            <div className="mt-6 space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Granular Module Permissions</label>
              <div className="overflow-hidden rounded-xl border border-border/70">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/60 text-muted-foreground border-b border-border/70">
                    <tr>
                      <th className="p-3 font-semibold">Module</th>
                      <th className="p-3 text-center font-semibold">View</th>
                      <th className="p-3 text-center font-semibold">Create</th>
                      <th className="p-3 text-center font-semibold">Edit</th>
                      <th className="p-3 text-center font-semibold">Delete</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {/* Quotations */}
                    <tr>
                      <td className="p-3 font-medium flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-500" /> Quotations
                      </td>
                      {(["view", "create", "edit", "delete"] as const).map((act) => (
                        <td key={act} className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={editingMember.permissions.quotations[act]}
                            onChange={() => handleTogglePerm("quotations", act)}
                            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                          />
                        </td>
                      ))}
                    </tr>

                    {/* Purchase Orders */}
                    <tr>
                      <td className="p-3 font-medium flex items-center gap-2">
                        <ShoppingBag className="h-4 w-4 text-purple-500" /> Purchase Orders
                      </td>
                      {(["view", "create", "edit", "delete"] as const).map((act) => (
                        <td key={act} className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={editingMember.permissions.purchaseOrders[act]}
                            onChange={() => handleTogglePerm("purchaseOrders", act)}
                            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                          />
                        </td>
                      ))}
                    </tr>

                    {/* Invoices */}
                    <tr>
                      <td className="p-3 font-medium flex items-center gap-2">
                        <Receipt className="h-4 w-4 text-emerald-500" /> Invoices
                      </td>
                      {(["view", "create", "edit", "delete"] as const).map((act) => (
                        <td key={act} className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={editingMember.permissions.invoices[act]}
                            onChange={() => handleTogglePerm("invoices", act)}
                            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                          />
                        </td>
                      ))}
                    </tr>

                    {/* Expenses */}
                    <tr>
                      <td className="p-3 font-medium flex items-center gap-2">
                        <Wallet className="h-4 w-4 text-amber-500" /> Expenses
                      </td>
                      {(["view", "create", "edit", "delete"] as const).map((act) => (
                        <td key={act} className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={editingMember.permissions.expenses[act]}
                            onChange={() => handleTogglePerm("expenses", act)}
                            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                          />
                        </td>
                      ))}
                    </tr>

                    {/* Project Details */}
                    <tr>
                      <td className="p-3 font-medium flex items-center gap-2">
                        <Folder className="h-4 w-4 text-primary" /> Project Metadata
                      </td>
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={editingMember.permissions.projectDetails.view}
                          onChange={() => handleTogglePerm("projectDetails", "view")}
                          className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                        />
                      </td>
                      <td className="p-3 text-center text-muted-foreground">—</td>
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={editingMember.permissions.projectDetails.edit}
                          onChange={() => handleTogglePerm("projectDetails", "edit")}
                          className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                        />
                      </td>
                      <td className="p-3 text-center text-muted-foreground">—</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-border/60 pt-4">
              <button
                onClick={() => setEditingMember(null)}
                className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveMember}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save Member Permissions"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
