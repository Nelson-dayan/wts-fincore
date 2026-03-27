"use client";

import { useEffect, useState } from "react";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AdminUser = {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "employee";
  isActive: boolean;
  phone?: string;
  createdAt: string;
  updatedAt?: string;
};

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
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phoneNumber: "",
    role: "employee" as "admin" | "employee",
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
      const payload = (await response.json()) as {
        users?: AdminUser[];
        total?: number;
        message?: string;
      };
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
      const payload = (await response.json()) as { message?: string };
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
      const payload = (await response.json()) as { message?: string };
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
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(payload.message ?? "Failed to delete user");
      await loadUsers(page, query);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete user");
    } finally {
      setSavingId("");
    }
  }

  return (
    <div className="animate-[fade-in_0.4s_ease-out_both]">
      <DashboardPageHeader
        title="Users"
        description="Create users, update roles/status, and remove users with full admin control."
      />
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base">Add User</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={createUser} className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="new-name">Name</Label>
              <Input
                id="new-name"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="new-email">Email</Label>
              <Input
                id="new-email"
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="new-password">Password</Label>
              <Input
                id="new-password"
                required
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="new-phone">Phone</Label>
              <Input
                id="new-phone"
                value={form.phoneNumber}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phoneNumber: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="new-role">Role</Label>
              <select
                id="new-role"
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm"
                value={form.role}
                onChange={(e) =>
                  setForm((f) => ({ ...f, role: e.target.value as "admin" | "employee" }))
                }
              >
                <option value="employee">employee</option>
                <option value="admin">admin</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={savingId === "create"}>
                {savingId === "create" ? "Creating..." : "Add User"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All users ({total})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search users by name or email"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setPage(1);
                loadUsers(1, query);
              }}
            >
              Search
            </Button>
          </div>
          {error ? (
            <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
              {error}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-3">Name</th>
                    <th className="py-2 pr-3">Email</th>
                    <th className="py-2 pr-3">Role</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Phone</th>
                    <th className="py-2 pr-3">Joined</th>
                    <th className="py-2 pr-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user._id} className="border-t border-border/70">
                      <td className="py-2 pr-3 font-medium">
                        {editingId === user._id ? (
                          <Input
                            value={drafts[user._id]?.name ?? user.name}
                            onChange={(e) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [user._id]: {
                                  ...(prev[user._id] ?? user),
                                  name: e.target.value,
                                },
                              }))
                            }
                          />
                        ) : (
                          user.name
                        )}
                      </td>
                      <td className="py-2 pr-3">{user.email}</td>
                      <td className="py-2 pr-3 uppercase">
                        {editingId === user._id ? (
                          <select
                            className="h-9 rounded-lg border border-border bg-background px-2 text-sm"
                            value={drafts[user._id]?.role ?? user.role}
                            onChange={(e) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [user._id]: {
                                  ...(prev[user._id] ?? user),
                                  role: e.target.value as "admin" | "employee",
                                },
                              }))
                            }
                          >
                            <option value="admin">admin</option>
                            <option value="employee">employee</option>
                          </select>
                        ) : (
                          user.role
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        {editingId === user._id ? (
                          <select
                            className="h-9 rounded-lg border border-border bg-background px-2 text-sm"
                            value={String(drafts[user._id]?.isActive ?? user.isActive)}
                            onChange={(e) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [user._id]: {
                                  ...(prev[user._id] ?? user),
                                  isActive: e.target.value === "true",
                                },
                              }))
                            }
                          >
                            <option value="true">active</option>
                            <option value="false">inactive</option>
                          </select>
                        ) : user.isActive ? (
                          "active"
                        ) : (
                          "inactive"
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        {editingId === user._id ? (
                          <Input
                            value={drafts[user._id]?.phone ?? user.phone ?? ""}
                            onChange={(e) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [user._id]: {
                                  ...(prev[user._id] ?? user),
                                  phone: e.target.value,
                                },
                              }))
                            }
                          />
                        ) : (
                          user.phone || "-"
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-2 pr-3">
                        <div className="flex gap-2">
                          {editingId === user._id ? (
                            <>
                              <Button
                                size="sm"
                                onClick={() => saveUser(user._id)}
                                disabled={savingId === user._id}
                              >
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingId(null)}
                              >
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingId(user._id);
                                  setDrafts((prev) => ({
                                    ...prev,
                                    [user._id]: { ...user },
                                  }));
                                }}
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => deleteUser(user._id)}
                                disabled={savingId === user._id}
                              >
                                Delete
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-4 flex items-center justify-between text-sm">
            <Button
              variant="outline"
              disabled={loading || page <= 1}
              onClick={() => {
                const next = Math.max(1, page - 1);
                setPage(next);
                loadUsers(next, query);
              }}
            >
              Previous
            </Button>
            <span className="text-muted-foreground">
              Page {page} of {Math.max(1, Math.ceil(total / limit))}
            </span>
            <Button
              variant="outline"
              disabled={loading || page >= Math.max(1, Math.ceil(total / limit))}
              onClick={() => {
                const next = Math.min(Math.ceil(total / limit), page + 1);
                setPage(next);
                loadUsers(next, query);
              }}
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
