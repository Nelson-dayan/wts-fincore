"use client";

import { useEffect, useState } from "react";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { AddUserForm } from "@/components/portals/admin-users/add-user-form";
import { UsersTable } from "@/components/portals/admin-users/users-table";
import { AdminResetPasswordModal } from "@/components/portals/admin-users/admin-reset-password-modal";
import { EditUserAccessModal } from "@/components/portals/admin-users/edit-user-access-modal";
import type { AdminUser, NewUserForm } from "@/components/portals/admin-users/types";
import type { CompanyOption } from "@/components/companies/company-switcher";
import { apiFetch } from "@/lib/api/client";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { normalizePhoneInput, parseRegisterPayload } from "@/lib/register/validate";

export function AdminUsersClient() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const limit = 10;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string>("");
  const [drafts, setDrafts] = useState<Record<string, Partial<AdminUser>>>({});
  const [form, setForm] = useState<NewUserForm>({
    name: "",
    email: "",
    password: "",
    phoneNumber: "",
    role: "employee",
    companyIds: [],
    groupIds: [],
    groupViewAccess: false,
    primaryCompanyId: "",
  });
  const [saveTargetId, setSaveTargetId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [resetTargetUser, setResetTargetUser] = useState<AdminUser | null>(null);
  const [accessTargetUser, setAccessTargetUser] = useState<AdminUser | null>(null);

  async function loadUsers(nextPage = page, nextQuery = query) {
    setLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams({
        page: String(nextPage),
        limit: String(limit),
        q: nextQuery,
      });
      const payload = await apiFetch<{
        users?: AdminUser[];
        total?: number;
      }>(`/api/admin/users?${qs.toString()}`);
      
      setUsers(payload.users ?? []);
      setTotal(payload.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  async function loadCompanies() {
    try {
      const res = await apiFetch<{ items?: CompanyOption[] }>("/api/admin/companies");
      setCompanies(res.items || []);
    } catch (e) {
      console.error("Failed to load companies for user form:", e);
    }
  }

  useEffect(() => {
    loadUsers(1, "");
    loadCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSavingId("create");
    setError("");
    try {
      const payloadForValidation = {
        ...form,
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phoneNumber: normalizePhoneInput(form.phoneNumber),
      };
      const validation = parseRegisterPayload(payloadForValidation);
      if (!validation.ok) {
        throw new Error(validation.message);
      }

      await apiFetch<{ message?: string }>("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...validation.data,
          role: form.role,
          companyIds: form.companyIds,
          groupIds: form.groupIds,
          groupViewAccess: form.groupViewAccess,
          primaryCompanyId: form.primaryCompanyId,
        }),
      });

      setForm({
        name: "",
        email: "",
        password: "",
        phoneNumber: "",
        role: "employee",
        companyIds: [],
        groupIds: [],
        groupViewAccess: false,
        primaryCompanyId: "",
      });

      await loadUsers(1, query);
      setPage(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create user");
    } finally {
      setSavingId("");
    }
  }

  async function saveUser(userId: string): Promise<boolean> {
    const draft = drafts[userId];
    if (!draft) return false;
    setSavingId(userId);
    setError("");
    try {
      await apiFetch<{ message?: string }>(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name,
          role: draft.role,
          phone: draft.phone,
          isActive: draft.isActive,
          companyIds: draft.companyIds,
          groupIds: draft.groupIds,
          groupViewAccess: draft.groupViewAccess,
        }),
      });
      setEditingId(null);
      setDrafts((prev) => {
        const copy = { ...prev };
        delete copy[userId];
        return copy;
      });
      await loadUsers(page, query);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update user");
      return false;
    } finally {
      setSavingId("");
    }
  }

  async function deleteUser(userId: string): Promise<boolean> {
    setSavingId(userId);
    setError("");
    try {
      await apiFetch<{ message?: string }>(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });
      await loadUsers(page, query);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete user");
      return false;
    } finally {
      setSavingId("");
    }
  }

  return (
    <div className="animate-fade-in space-y-8">
      <ConfirmDialog
        open={saveTargetId !== null}
        onOpenChange={(o) => {
          if (!o) setSaveTargetId(null);
        }}
        title="Save user changes?"
        description="Updates name, role, phone, and active status for this account."
        confirmLabel="Save"
        loading={Boolean(saveTargetId && savingId === saveTargetId)}
        onConfirm={async () => {
          if (!saveTargetId) return;
          const ok = await saveUser(saveTargetId);
          if (ok) setSaveTargetId(null);
        }}
      />
      <ConfirmDialog
        open={deleteTargetId !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteTargetId(null);
        }}
        title="Delete this user?"
        description="This removes the account from the workspace. This cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        loading={Boolean(deleteTargetId && savingId === deleteTargetId)}
        onConfirm={async () => {
          if (!deleteTargetId) return;
          const ok = await deleteUser(deleteTargetId);
          if (ok) setDeleteTargetId(null);
        }}
      />
      <DashboardPageHeader
        title="Users & Access Management"
        description="Invite team members, assign operating company scopes, configure group access, and manage enterprise security roles."
      />

      <div className="space-y-8">
        <AddUserForm
          form={form}
          saving={savingId === "create"}
          companies={companies}
          onFormChange={setForm}
          onSubmit={createUser}
        />
        <UsersTable
          users={users}
          companies={companies}
          total={total}
          page={page}
          limit={limit}
          loading={loading}
          error={error}
          query={query}
          editingId={editingId}
          savingId={savingId}
          drafts={drafts}
          onQueryChange={setQuery}
          onSearch={(override) => {
            const nextQuery = override !== undefined ? override : query;
            setPage(1);
            loadUsers(1, nextQuery);
          }}
          onPrev={() => {
            const next = Math.max(1, page - 1);
            setPage(next);
            loadUsers(next, query);
          }}
          onNext={() => {
            const next = Math.min(Math.ceil(total / limit), page + 1);
            setPage(next);
            loadUsers(next, query);
          }}
          onStartEdit={(user) => {
            setEditingId(user._id);
            setDrafts((prev) => ({ ...prev, [user._id]: { ...user } }));
          }}
          onCancelEdit={() => setEditingId(null)}
          onDraftChange={(userId, patch) =>
            setDrafts((prev) => ({
              ...prev,
              [userId]: { ...(prev[userId] ?? {}), ...patch },
            }))
          }
          onSave={(id) => setSaveTargetId(id)}
          onOpenAccessModal={(user) => setAccessTargetUser(user)}
          onDelete={(id) => setDeleteTargetId(id)}
          onResetPassword={(user) => setResetTargetUser(user)}
        />
      </div>

      <AdminResetPasswordModal
        user={resetTargetUser}
        onClose={() => setResetTargetUser(null)}
        onResetComplete={() => {
          setResetTargetUser(null);
          loadUsers(page, query);
        }}
      />

      <EditUserAccessModal
        user={accessTargetUser}
        companies={companies}
        onClose={() => setAccessTargetUser(null)}
        onSaveComplete={() => {
          setAccessTargetUser(null);
          loadUsers(page, query);
        }}
      />
    </div>
  );
}
