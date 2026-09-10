"use client";

import { useState } from "react";
import { Eye, EyeOff, Lock, Mail, Phone, RefreshCw, Shield, Sparkles, User, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { NewUserForm } from "./types";

function generateSecurePassword() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  let pass = "";
  for (let i = 0; i < 12; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

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
  const [showPassword, setShowPassword] = useState(false);

  const handleAutoGenerate = () => {
    const pass = generateSecurePassword();
    onFormChange({ ...form, password: pass });
    setShowPassword(true);
  };

  return (
    <Card className="glass-card overflow-hidden border border-border/70 shadow-lg transition-all duration-300 hover:shadow-xl">
      <div className="h-1 bg-linear-to-r from-primary via-indigo-500 to-sky-400" />
      <CardHeader className="pb-3 pt-6 px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20 shadow-xs">
              <UserPlus className="size-5.5" aria-hidden />
            </div>
            <div>
              <CardTitle className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
                Add New Team Member
              </CardTitle>
              <CardDescription className="mt-0.5 text-xs text-muted-foreground">
                Set up new employee or admin credentials to grant portal access.
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 pt-2">
        <form onSubmit={onSubmit} className="grid gap-5 sm:grid-cols-2">
          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="new-name" className="text-xs font-semibold text-foreground/90">
              Full Name
            </Label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70" />
              <Input
                id="new-name"
                required
                autoComplete="name"
                placeholder="Alex Rivera"
                className="h-10 pl-9.5 text-xs font-medium border-border/70 bg-background/50 focus:bg-background transition-all"
                value={form.name}
                onChange={(e) => onFormChange({ ...form, name: e.target.value })}
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="new-email" className="text-xs font-semibold text-foreground/90">
              Work Email
            </Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70" />
              <Input
                id="new-email"
                required
                type="email"
                autoComplete="email"
                placeholder="alex@company.com"
                className="h-10 pl-9.5 text-xs font-medium border-border/70 bg-background/50 focus:bg-background transition-all"
                value={form.email}
                onChange={(e) => onFormChange({ ...form, email: e.target.value })}
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="new-password" className="text-xs font-semibold text-foreground/90">
                Initial Password
              </Label>
              <button
                type="button"
                onClick={handleAutoGenerate}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
              >
                <Sparkles className="size-3 text-amber-500" /> Generate
              </button>
            </div>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70" />
              <Input
                id="new-password"
                required
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="••••••••••••"
                className="h-10 pl-9.5 pr-9 text-xs font-mono border-border/70 bg-background/50 focus:bg-background transition-all"
                value={form.password}
                onChange={(e) => onFormChange({ ...form, password: e.target.value })}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {/* Phone Number */}
          <div className="space-y-2">
            <Label htmlFor="new-phone" className="text-xs font-semibold text-foreground/90">
              Phone Number <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70" />
              <Input
                id="new-phone"
                type="tel"
                autoComplete="tel"
                placeholder="+1 555 019 2831"
                className="h-10 pl-9.5 text-xs font-medium border-border/70 bg-background/50 focus:bg-background transition-all"
                value={form.phoneNumber}
                onChange={(e) => onFormChange({ ...form, phoneNumber: e.target.value })}
              />
            </div>
          </div>

          {/* Role / Access Level */}
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="new-role" className="text-xs font-semibold text-foreground/90 flex items-center gap-1.5">
              <Shield className="size-3.5 text-primary" /> Role & Permissions
            </Label>
            <Select
              id="new-role"
              value={form.role}
              className="h-10 text-xs font-medium border-border/70 bg-background/50"
              onChange={(e) =>
                onFormChange({ ...form, role: e.target.value as "admin" | "employee" })
              }
              options={[
                { value: "employee", label: "Employee — Access to assigned projects & Quotations" },
                { value: "admin", label: "Admin — Full System & User Management access" },
              ]}
            />
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end pt-2 sm:col-span-2">
            <Button
              type="submit"
              disabled={saving}
              className="h-10 px-6 rounded-xl font-bold text-xs shadow-md shadow-primary/20 transition-all hover:scale-[1.01]"
            >
              {saving ? (
                <>
                  <RefreshCw className="mr-2 size-4 animate-spin" />
                  Creating Account…
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 size-4" />
                  Create User Account
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
