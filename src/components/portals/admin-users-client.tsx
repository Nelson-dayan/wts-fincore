"use client";

import { useEffect, useState } from "react";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { AddUserForm } from "@/components/portals/admin-users/add-user-form";
import { UsersTable } from "@/components/portals/admin-users/users-table";
import type { AdminUser, NewUserForm } from "@/components/portals/admin-users/types";
import { readResponseJson } from "@/lib/http/read-response-json";

export function AdminUsersClient() {
  const [users, setUsers] = useState<AdminUser[]>([]);
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
  });

  async function loadUsers(nextPage = page, nextQuery = query) {
    setLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams({
        page: String(nextPage),
        limit: String(limit),
        q: nextQuery,
      });
      const response = await fetch(`/api/admin/users?${qs.toString()}`, {
        cache: "no-store",
      });
      const payload = await readResponseJson<{
        users?: AdminUser[];
        total?: number;
        message?: string;
      }>(response);
      if (!response.ok) {
        throw new Error(payload.message ?? "Request failed");
      }
      setUsers(payload.users ?? []);
      setTotal(payload.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers(1, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSavingId("create");
    setError("");
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await readResponseJson<{ message?: string }>(response);
      if (!response.ok) throw new Error(payload.message ?? "Failed to create user");
      setForm({ name: "", email: "", password: "", phoneNumber: "", role: "employee" });
      await loadUsers(1, query);
      setPage(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create user");
    } finally {
      setSavingId("");
    }
  }

  async function saveUser(userId: string) {
    const draft = drafts[userId];
    if (!draft) return;
    setSavingId(userId);
    setError("");
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name,
          role: draft.role,
          phone: draft.phone,
          isActive: draft.isActive,
        }),
      });
      const payload = await readResponseJson<{ message?: string }>(response);
      if (!response.ok) throw new Error(payload.message ?? "Failed to update user");
      setEditingId(null);
      setDrafts((prev) => {
        const copy = { ...prev };
        delete copy[userId];
        return copy;
      });
      await loadUsers(page, query);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update user");
    } finally {
      setSavingId("");
    }
  }

  async function deleteUser(userId: string) {
    setSavingId(userId);
    setError("");
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });
      const payload = await readResponseJson<{ message?: string }>(response);
      if (!response.ok) throw new Error(payload.message ?? "Failed to delete user");
      await loadUsers(page, query);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete user");
    } finally {
      setSavingId("");
    }
  }

  return (
    <div className="animate-fade-in">
      <DashboardPageHeader
        title="Users"
        description="Invite teammates, assign roles, and keep your workspace access clean—from one calm control surface."
      />

      <div className="space-y-8">
      <AddUserForm
        form={form}
        saving={savingId === "create"}
        onFormChange={setForm}
        onSubmit={createUser}
      />
      <UsersTable
        users={users}
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
        onSave={saveUser}
        onDelete={deleteUser}
      />
      </div>
    </div>
  );
}
