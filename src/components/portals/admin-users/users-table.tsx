"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { AdminUser } from "./types";

export function UsersTable({
  users,
  total,
  page,
  limit,
  loading,
  error,
  query,
  editingId,
  savingId,
  drafts,
  onQueryChange,
  onSearch,
  onPrev,
  onNext,
  onStartEdit,
  onCancelEdit,
  onDraftChange,
  onSave,
  onDelete,
}: {
  users: AdminUser[];
  total: number;
  page: number;
  limit: number;
  loading: boolean;
  error: string;
  query: string;
  editingId: string | null;
  savingId: string;
  drafts: Record<string, Partial<AdminUser>>;
  onQueryChange: (value: string) => void;
  onSearch: () => void;
  onPrev: () => void;
  onNext: () => void;
  onStartEdit: (user: AdminUser) => void;
  onCancelEdit: () => void;
  onDraftChange: (userId: string, patch: Partial<AdminUser>) => void;
  onSave: (userId: string) => void;
  onDelete: (userId: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">All users ({total})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-3 flex gap-2">
          <Input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search users by name or email"
          />
          <Button type="button" variant="outline" onClick={onSearch}>
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
                            onDraftChange(user._id, { name: e.target.value })
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
                            onDraftChange(user._id, {
                              role: e.target.value as "admin" | "employee",
                            })
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
                            onDraftChange(user._id, {
                              isActive: e.target.value === "true",
                            })
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
                            onDraftChange(user._id, { phone: e.target.value })
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
                              onClick={() => onSave(user._id)}
                              disabled={savingId === user._id}
                            >
                              Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={onCancelEdit}>
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onStartEdit(user)}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => onDelete(user._id)}
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
          <Button variant="outline" disabled={loading || page <= 1} onClick={onPrev}>
            Previous
          </Button>
          <span className="text-muted-foreground">
            Page {page} of {Math.max(1, Math.ceil(total / limit))}
          </span>
          <Button
            variant="outline"
            disabled={loading || page >= Math.max(1, Math.ceil(total / limit))}
            onClick={onNext}
          >
            Next
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
