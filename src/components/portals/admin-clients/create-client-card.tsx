"use client";

import { Building2, Globe, Loader2, Mail, MapPin, Phone, User, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UploadCard } from "@/components/ui/upload-card";
import { safeString } from "./helpers";
import type { ClientForm } from "./types";

type CreateClientCardProps = {
  form: ClientForm;
  saving: boolean;
  onFormChange: (next: ClientForm) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
};

export function CreateClientCard({ form, saving, onFormChange, onSubmit }: CreateClientCardProps) {
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
                Add New Client Profile
              </CardTitle>
              <CardDescription className="mt-0.5 text-xs text-muted-foreground">
                Capture the client contact details, branding assets, and billing profile.
              </CardDescription>
            </div>
          </div>
          <span className="inline-flex w-fit items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
            New Client Record
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-6 pt-2">
        <form onSubmit={onSubmit} className="grid gap-5 sm:grid-cols-2">
          {/* Logo & Signature Uploads */}
          <div className="space-y-3 sm:col-span-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Branding Assets (Optional)
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <UploadCard
                label="Upload Client Logo"
                value={form.clientLogoText}
                onChange={(val) => onFormChange({ ...form, clientLogoText: val })}
              />
              <UploadCard
                label="Upload Client Signature"
                value={form.clientSignatureText}
                onChange={(val) => onFormChange({ ...form, clientSignatureText: val })}
              />
            </div>
          </div>

          {/* Contact Name */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground/90">Contact Name</Label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70" />
              <Input
                required
                autoComplete="name"
                placeholder="Jordan Lee"
                className="h-10 pl-9.5 text-xs font-medium border-border/70 bg-background/50 focus:bg-background transition-all"
                value={safeString(form.name)}
                onChange={(e) => onFormChange({ ...form, name: e.target.value })}
              />
            </div>
          </div>

          {/* Company */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground/90">Company Name</Label>
            <div className="relative">
              <Building2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70" />
              <Input
                required
                autoComplete="organization"
                placeholder="Acme Industries"
                className="h-10 pl-9.5 text-xs font-medium border-border/70 bg-background/50 focus:bg-background transition-all"
                value={safeString(form.company)}
                onChange={(e) => onFormChange({ ...form, company: e.target.value })}
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground/90">Email Address</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70" />
              <Input
                required
                type="email"
                autoComplete="email"
                placeholder="hello@company.com"
                className="h-10 pl-9.5 text-xs font-medium border-border/70 bg-background/50 focus:bg-background transition-all"
                value={safeString(form.email)}
                onChange={(e) => onFormChange({ ...form, email: e.target.value })}
              />
            </div>
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground/90">Phone Number</Label>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70" />
              <Input
                required
                type="tel"
                autoComplete="tel"
                placeholder="+1 555 019 2831"
                className="h-10 pl-9.5 text-xs font-medium border-border/70 bg-background/50 focus:bg-background transition-all"
                value={safeString(form.phone)}
                onChange={(e) => onFormChange({ ...form, phone: e.target.value })}
              />
            </div>
          </div>

          {/* Website */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground/90">
              Website <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <div className="relative">
              <Globe className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70" />
              <Input
                type="url"
                autoComplete="url"
                placeholder="https://example.com"
                className="h-10 pl-9.5 text-xs font-medium border-border/70 bg-background/50 focus:bg-background transition-all"
                value={safeString(form.website)}
                onChange={(e) => onFormChange({ ...form, website: e.target.value })}
              />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-2 sm:col-span-2">
            <Label className="text-xs font-semibold text-foreground/90">Physical / Billing Address</Label>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70" />
              <Input
                required
                autoComplete="street-address"
                placeholder="123 Business Way, Suite 400, San Francisco, CA"
                className="h-10 pl-9.5 text-xs font-medium border-border/70 bg-background/50 focus:bg-background transition-all"
                value={safeString(form.address)}
                onChange={(e) => onFormChange({ ...form, address: e.target.value })}
              />
            </div>
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
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                  Saving Client Record…
                </>
              ) : (
                "Create Client Profile"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
