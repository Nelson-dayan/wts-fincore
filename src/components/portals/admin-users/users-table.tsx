"use client";

import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil,
  Search,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  onSearch: (queryOverride?: string) => void;
  onPrev: () => void;
  onNext: () => void;
  onStartEdit: (user: AdminUser) => void;
  onCancelEdit: () => void;
  onDraftChange: (userId: string, patch: Partial<AdminUser>) => void;
  onSave: (userId: string) => void;
  onDelete: (userId: string) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const end = Math.min(page * limit, total);
  const start = total === 0 ? 0 : (page - 1) * limit + 1;

  return (
    <Card className="overflow-hidden border-border/80">
      <CardHeader className="border-b border-border/60 bg-muted/20 pb-5 dark:bg-muted/10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle className="text-[1.15rem] sm:text-xl">Team directory</CardTitle>
            <CardDescription className="mt-1.5 max-w-lg">
              Search by name or email. Inline edits for role, status, and phone—save when you&apos;re done.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-border/80 bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
            <span className="tabular-nums text-foreground">{total}</span>
            <span>members</span>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={query ?? ""}
              onChange={(e) => onQueryChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSearch(undefined)}
              placeholder="Search by name or email…"
              className="h-11 border-border/80 bg-background/80 pl-10 pr-4"
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="default"
              className="h-11 shrink-0 rounded-xl px-5"
              onClick={() => onSearch(undefined)}
            >
              Search
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 shrink-0 rounded-xl"
              onClick={() => {
                onQueryChange("");
                onSearch("");
              }}
              disabled={!query?.trim()}
            >
              Clear
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {error ? (
          <div className="m-5 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : loading && users.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
            <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
            <p className="text-sm font-medium">Loading directory…</p>
          </div>
        ) : !loading && users.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-muted/70 text-muted-foreground">
              <UserRound className="size-7" aria-hidden />
            </span>
            <p className="text-base font-semibold text-foreground">No users match</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Try another search, or invite someone new with the form above.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-230 text-left text-sm">
              <thead>
                <tr className="border-b border-border/80 bg-muted/30 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground dark:bg-muted/15">
                  <th className="px-5 py-3.5 pr-3">Member</th>
                  <th className="px-0 py-3.5 pr-3">Email</th>
                  <th className="px-0 py-3.5 pr-3">Role</th>
                  <th className="px-0 py-3.5 pr-3">Status</th>
                  <th className="px-0 py-3.5 pr-3">Phone</th>
                  <th className="px-0 py-3.5 pr-3">Joined</th>
                  <th className="px-0 py-3.5 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {users.map((user) => {
                  const isEditing = editingId === user._id;
                  const draft = drafts[user._id];
                  return (
                    <tr
                      key={user._id}
                      className="bg-card transition-colors hover:bg-muted/35 dark:hover:bg-muted/20"
                    >
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
                      <td className="max-w-50 truncate px-0 py-3.5 pr-3 text-muted-foreground">
                        {user.email}
                      </td>
                      <td className="px-0 py-3.5 pr-3 align-middle">
                        {isEditing ? (
                          <Select
                            value={draft?.role ?? user.role}
                            className="h-9 max-w-40 text-sm"
                            onChange={(e) =>
                              onDraftChange(user._id, {
                                role: e.target.value as "admin" | "employee",
                              })
                            }
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
                            onChange={(e) =>
                              onDraftChange(user._id, {
                                isActive: e.target.value === "true",
                              })
                            }
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
                              <Button
                                size="sm"
                                className="h-8 rounded-lg px-3"
                                onClick={() => onSave(user._id)}
                                disabled={savingId === user._id}
                              >
                                {savingId === user._id ? (
                                  <>
                                    <Loader2 className="mr-1.5 size-3.5 animate-spin" aria-hidden />
                                    Save
                                  </>
                                ) : (
                                  "Save"
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 rounded-lg px-2"
                                onClick={onCancelEdit}
                              >
                                <X className="size-4" aria-label="Cancel edit" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 rounded-lg px-2.5"
                                onClick={() => onStartEdit(user)}
                              >
                                <Pencil className="size-3.5" aria-hidden />
                                <span className="sr-only sm:not-sr-only sm:ml-1.5 sm:text-xs">Edit</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-8 rounded-lg px-2.5"
                                onClick={() => onDelete(user._id)}
                                disabled={savingId === user._id}
                              >
                                <Trash2 className="size-3.5" aria-hidden />
                                <span className="sr-only sm:not-sr-only sm:ml-1.5 sm:text-xs">Delete</span>
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {users.length > 0 ? (
          <div className="flex flex-col gap-3 border-t border-border/60 bg-muted/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:bg-muted/5">
            <p className="text-xs text-muted-foreground">
              Showing{" "}
              <span className="font-medium text-foreground">
                {start}–{end}
              </span>{" "}
              of <span className="font-medium text-foreground">{total}</span>
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9 rounded-lg"
                disabled={loading || page <= 1}
                onClick={onPrev}
              >
                <ChevronLeft className="mr-1 size-4" aria-hidden />
                Previous
              </Button>
              <span className="rounded-lg border border-border/80 bg-background px-3 py-1.5 text-xs font-medium tabular-nums text-muted-foreground">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-9 rounded-lg"
                disabled={loading || page >= totalPages}
                onClick={onNext}
              >
                Next
                <ChevronRight className="ml-1 size-4" aria-hidden />
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
