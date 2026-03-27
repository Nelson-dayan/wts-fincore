"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { NewUserForm } from "./types";

export function AddUserForm({
  form,
  saving,
  onFormChange,
  onSubmit,
}: {
  form: NewUserForm;
  saving: boolean;
  onFormChange: (next: NewUserForm) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-base">Add User</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="new-name">Name</Label>
            <Input
              id="new-name"
              required
              value={form.name}
              onChange={(e) => onFormChange({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-email">Email</Label>
            <Input
              id="new-email"
              required
              type="email"
              value={form.email}
              onChange={(e) => onFormChange({ ...form, email: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-password">Password</Label>
            <Input
              id="new-password"
              required
              type="password"
              value={form.password}
              onChange={(e) => onFormChange({ ...form, password: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-phone">Phone</Label>
            <Input
              id="new-phone"
              value={form.phoneNumber}
              onChange={(e) => onFormChange({ ...form, phoneNumber: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-role">Role</Label>
            <Select
              id="new-role"
              value={form.role}
              onChange={(e) =>
                onFormChange({ ...form, role: e.target.value as "admin" | "employee" })
              }
              options={[
                { value: "employee", label: "employee" },
                { value: "admin", label: "admin" },
              ]}
            />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Creating..." : "Add User"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
