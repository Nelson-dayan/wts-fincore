"use client";

import { useState } from "react";
import {
  Building2,
  Check,
  Crown,
  Eye,
  EyeOff,
  Layers,
  Lock,
  Mail,
  Network,
  Phone,
  RefreshCw,
  Shield,
  ShieldAlert,
  Sparkles,
  User,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { NewUserForm } from "./types";
import type { CompanyOption } from "@/components/companies/company-switcher";

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
  companies = [],
  onFormChange,
  onSubmit,
}: {
  form: NewUserForm;
  saving: boolean;
  companies?: CompanyOption[];
  onFormChange: (next: NewUserForm) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}) {
  const [showPassword, setShowPassword] = useState(false);

  const handleAutoGenerate = () => {
    const pass = generateSecurePassword();
    onFormChange({ ...form, password: pass });
    setShowPassword(true);
  };

  const toggleCompanyId = (id: string) => {
    const current = form.companyIds || [];
    const next = current.includes(id)
      ? current.filter((c) => c !== id)
      : [...current, id];
    onFormChange({
      ...form,
      companyIds: next,
      primaryCompanyId: next.includes(form.primaryCompanyId) ? form.primaryCompanyId : (next[0] || ""),
    });
  };

  const selectAllCompanies = () => {
    const allIds = companies.map((c) => c._id);
    onFormChange({
      ...form,
      companyIds: allIds,
      primaryCompanyId: allIds[0] || "",
    });
  };

  const clearAllCompanies = () => {
    onFormChange({
      ...form,
      companyIds: [],
      primaryCompanyId: "",
    });
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
                Configure user identity, assigned company operating environments, and security privileges.
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

          {/* Role & System Level Privileges */}
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="new-role" className="text-xs font-semibold text-foreground/90 flex items-center gap-1.5">
              <Shield className="size-3.5 text-primary" /> Role & System Privilege
            </Label>
            <Select
              id="new-role"
              value={form.role}
              className="h-10 text-xs font-medium border-border/70 bg-background/50"
              onChange={(e) =>
                onFormChange({ ...form, role: e.target.value as "admin" | "employee" | "super_admin" })
              }
              options={[
                { value: "employee", label: "Employee — Access to assigned projects & Quotations" },
                { value: "admin", label: "Admin — Full Management within assigned companies" },
                { value: "super_admin", label: "Super Admin — Global System Access across ALL Companies & Groups" },
              ]}
            />
            {form.role === "super_admin" && (
              <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-600 dark:text-amber-400 mt-2">
                <Crown className="size-4 shrink-0 text-amber-500" />
                <span>
                  <strong>Super Admin Privilege Active:</strong> User bypasses tenant boundaries and has global administrative access across all operating entities.
                </span>
              </div>
            )}
          </div>

          {/* Multi-Company Operating Assignments */}
          <div className="space-y-3 sm:col-span-2 rounded-xl border border-border/60 bg-muted/20 p-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Building2 className="size-4 text-primary" />
                Assigned Operating Companies
              </Label>
              <div className="flex items-center gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={selectAllCompanies}
                  className="text-primary hover:underline font-medium"
                >
                  Select All
                </button>
                <span className="text-muted-foreground">•</span>
                <button
                  type="button"
                  onClick={clearAllCompanies}
                  className="text-muted-foreground hover:text-foreground hover:underline font-medium"
                >
                  Clear All
                </button>
              </div>
            </div>

            {companies.length === 0 ? (
              <div className="text-xs text-muted-foreground italic py-2">
                No active companies found. User will be linked to default operating company.
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {companies.map((comp) => {
                  const isChecked = (form.companyIds || []).includes(comp._id);

                  return (
                    <label
                      key={comp._id}
                      className={`flex items-center justify-between rounded-xl border p-2.5 cursor-pointer text-xs transition-all ${
                        isChecked
                          ? "border-primary/50 bg-primary/10 text-primary font-semibold shadow-xs"
                          : "border-border/60 bg-background/50 hover:bg-muted/40 text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <div
                          className={`size-4 rounded border flex items-center justify-center transition-colors ${
                            isChecked ? "bg-primary border-primary text-primary-foreground" : "border-border"
                          }`}
                        >
                          {isChecked && <Check className="size-3 stroke-[3]" />}
                        </div>
                        <div className="truncate">
                          <div className="truncate font-medium">{comp.name}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">
                            [{comp.code}] {comp.kind.toUpperCase()}
                          </div>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={isChecked}
                        onChange={() => toggleCompanyId(comp._id)}
                      />
                    </label>
                  );
                })}
              </div>
            )}

            {/* Primary Company Selection */}
            {(form.companyIds || []).length > 0 && (
              <div className="pt-2 border-t border-border/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <Label htmlFor="primary-company" className="text-xs font-semibold text-foreground/90">
                  Primary Company Context
                </Label>
                <Select
                  id="primary-company"
                  value={form.primaryCompanyId}
                  className="h-8 max-w-60 text-xs font-medium border-border/70"
                  onChange={(e) => onFormChange({ ...form, primaryCompanyId: e.target.value })}
                  options={companies
                    .filter((c) => (form.companyIds || []).includes(c._id))
                    .map((c) => ({
                      value: c._id,
                      label: `${c.name} [${c.code}]`,
                    }))}
                />
              </div>
            )}
          </div>

          {/* Group Access & Visibility Options */}
          <div className="space-y-3 sm:col-span-2 rounded-xl border border-border/60 bg-muted/20 p-4">
            <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Network className="size-4 text-indigo-500" />
              Group Hierarchy Visibility
            </Label>

            <label className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/50 p-3 cursor-pointer hover:bg-muted/40 transition-colors">
              <input
                type="checkbox"
                className="mt-0.5 size-4 rounded border-border text-primary focus:ring-primary"
                checked={form.groupViewAccess}
                onChange={(e) => onFormChange({ ...form, groupViewAccess: e.target.checked })}
              />
              <div className="space-y-0.5 text-xs">
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  <Layers className="size-3.5 text-primary" />
                  Enable Group View Access (`groupViewAccess`)
                </div>
                <div className="text-muted-foreground text-[11px] leading-relaxed">
                  Allows user to toggle between Single Company Mode and Group View Mode to read aggregated reports across subsidiary child companies within authorized parent groups.
                </div>
              </div>
            </label>
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
