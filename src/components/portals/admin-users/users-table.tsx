"use client";

import {
  ChevronLeft,
  ChevronRight,
  Search,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { UsersTableRow } from "@/components/portals/admin-users/users-table-row";
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
  onResetPassword,
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
  onResetPassword?: (user: AdminUser) => void;
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
          <div className="overflow-x-auto" aria-busy="true">
            <table className="w-full min-w-[760px] text-left text-sm">
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
                {Array.from({ length: 8 }).map((_, ri) => (
                  <tr key={ri} className="bg-card">
                    <td className="px-5 py-3.5 pr-3">
                      <div className="flex items-center gap-3">
                        <Skeleton className="size-10 shrink-0 rounded-full" />
                        <Skeleton className="h-4 w-36 max-w-full" />
                      </div>
                    </td>
                    <td className="px-0 py-3.5 pr-3">
                      <Skeleton className="h-4 w-44 max-w-full" />
                    </td>
                    <td className="px-0 py-3.5 pr-3">
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="px-0 py-3.5 pr-3">
                      <Skeleton className="h-7 w-20 rounded-full" />
                    </td>
                    <td className="px-0 py-3.5 pr-3">
                      <Skeleton className="h-4 w-28" />
                    </td>
                    <td className="px-0 py-3.5 pr-3">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="px-0 py-3.5 pr-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Skeleton className="h-8 w-16 rounded-md" />
                        <Skeleton className="h-8 w-16 rounded-md" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
            <table className="w-full min-w-[760px] text-left text-sm">
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
                {users.map((user) => (
                  <UsersTableRow
                    key={user._id}
                    user={user}
                    editingId={editingId}
                    savingId={savingId}
                    draft={drafts[user._id]}
                    onDraftChange={onDraftChange}
                    onSave={onSave}
                    onCancelEdit={onCancelEdit}
                    onStartEdit={onStartEdit}
                    onDelete={onDelete}
                    onResetPassword={onResetPassword}
                  />
                ))}
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
