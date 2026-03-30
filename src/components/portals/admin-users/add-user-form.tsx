"use client";

import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card className="overflow-hidden border-border/80 shadow-[0_24px_48px_-24px_rgba(0,0,0,0.22)] dark:shadow-[0_24px_56px_-24px_rgba(0,0,0,0.55)]">
      <div className="h-1 bg-gradient-to-r from-primary/80 via-primary to-primary/40" />
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary ring-1 ring-primary/20">
              <UserPlus className="size-5" aria-hidden />
            </span>
            <div>
              <CardTitle className="text-[1.15rem] sm:text-xl">Invite someone new</CardTitle>
              <CardDescription className="mt-1.5 max-w-xl">
                They&apos;ll sign in with email and password. You can tighten role and phone anytime from the
                table below.
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="new-name" className="text-foreground/90">
              Full name
            </Label>
            <Input
              id="new-name"
              required
              autoComplete="name"
              placeholder="Alex Rivera"
              className="h-11 border-border/80 bg-background/60"
              value={form.name}
              onChange={(e) => onFormChange({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-email" className="text-foreground/90">
              Work email
            </Label>
            <Input
              id="new-email"
              required
              type="email"
              autoComplete="email"
              placeholder="alex@company.com"
              className="h-11 border-border/80 bg-background/60"
              value={form.email}
              onChange={(e) => onFormChange({ ...form, email: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-password" className="text-foreground/90">
              Initial password
            </Label>
            <Input
              id="new-password"
              required
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              className="h-11 border-border/80 bg-background/60"
              value={form.password}
              onChange={(e) => onFormChange({ ...form, password: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-phone" className="text-foreground/90">
              Phone <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="new-phone"
              type="tel"
              autoComplete="tel"
              placeholder="+1 …"
              className="h-11 border-border/80 bg-background/60"
              value={form.phoneNumber}
              onChange={(e) => onFormChange({ ...form, phoneNumber: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-role" className="text-foreground/90">
              Access level
            </Label>
            <Select
              id="new-role"
              value={form.role}
              className="h-11"
              onChange={(e) =>
                onFormChange({ ...form, role: e.target.value as "admin" | "employee" })
              }
              options={[
                { value: "employee", label: "Employee — day-to-day portal" },
                { value: "admin", label: "Admin — full settings" },
              ]}
            />
          </div>
          <div className="flex items-end sm:col-span-2">
            <Button
              type="submit"
              disabled={saving}
              size="lg"
              className="h-11 w-full min-w-[200px] rounded-xl font-semibold shadow-md shadow-primary/15 sm:w-auto"
            >
              {saving ? "Creating account…" : "Create user"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
