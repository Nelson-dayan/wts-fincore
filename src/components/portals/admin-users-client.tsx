"use client";

import { useEffect, useState } from "react";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AdminUser = {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "employee";
  isActive: boolean;
  phone?: string;
  createdAt: string;
};

export function AdminUsersClient() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const response = await fetch("/api/admin/users", { cache: "no-store" });
        const payload = (await response.json()) as
          | { users: AdminUser[] }
          | { message?: string };
        if (!response.ok) {
          throw new Error("message" in payload ? payload.message ?? "Request failed" : "Request failed");
        }
        if (alive && "users" in payload) {
          setUsers(payload.users);
        }
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Failed to load users");
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="animate-[fade-in_0.4s_ease-out_both]">
      <DashboardPageHeader
        title="Users"
        description="Admin access to all accounts with role and status visibility."
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All users ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
              {error}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-3">Name</th>
                    <th className="py-2 pr-3">Email</th>
                    <th className="py-2 pr-3">Role</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Phone</th>
                    <th className="py-2 pr-3">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user._id} className="border-t border-border/70">
                      <td className="py-2 pr-3 font-medium">{user.name}</td>
                      <td className="py-2 pr-3">{user.email}</td>
                      <td className="py-2 pr-3 uppercase">{user.role}</td>
                      <td className="py-2 pr-3">
                        {user.isActive ? "active" : "inactive"}
                      </td>
                      <td className="py-2 pr-3">{user.phone || "-"}</td>
                      <td className="py-2 pr-3">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
