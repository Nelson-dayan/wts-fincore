"use client";

import { Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { readFileAsPdfSafeDataUrl } from "@/lib/portals/read-file-as-pdf-safe-data-url";
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
    <Card className="overflow-hidden border-border/80 shadow-[0_24px_48px_-24px_rgba(0,0,0,0.18)] dark:shadow-[0_24px_56px_-24px_rgba(0,0,0,0.5)]">
      <div className="h-1 bg-linear-to-r from-primary/80 via-primary to-primary/40" />
      <CardHeader className="border-b border-border/50 bg-muted/10 pb-5 dark:bg-muted/5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary ring-1 ring-primary/20">
              <UserPlus className="size-5" aria-hidden />
            </span>
            <div>
              <CardTitle className="text-[1.15rem] sm:text-xl">Add a client</CardTitle>
              <CardDescription className="mt-1.5 max-w-xl">
                Capture the basics now; open the profile anytime for documents, uploads, and history.
              </CardDescription>
            </div>
          </div>
          <span className="inline-flex w-fit items-center rounded-full border border-border/80 bg-background/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            New record
          </span>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        <form onSubmit={onSubmit} className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-3 sm:col-span-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Upload client logo &amp; signature (optional)
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-foreground/90">Upload client logo</Label>
                <Input
                  type="file"
                  accept="image/*"
                  className="h-11 cursor-pointer border-border/80 bg-background/60 file:mr-3 file:rounded-lg file:border-0 file:bg-primary/12 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-primary hover:file:bg-primary/18"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const text = await readFileAsPdfSafeDataUrl(file);
                    onFormChange({ ...form, clientLogoText: text });
                    e.target.value = "";
                  }}
                />
                {form.clientLogoText ? (
                  <div className="pt-1">
                    {/* eslint-disable-next-line @next/next/no-img-element -- data URL preview */}
                    <img
                      src={form.clientLogoText}
                      alt=""
                      className="h-10 max-w-40 rounded-md border border-border object-contain"
                    />
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No image yet</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-foreground/90">Upload client signature</Label>
                <Input
                  type="file"
                  accept="image/*"
                  className="h-11 cursor-pointer border-border/80 bg-background/60 file:mr-3 file:rounded-lg file:border-0 file:bg-primary/12 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-primary hover:file:bg-primary/18"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const text = await readFileAsPdfSafeDataUrl(file);
                    onFormChange({ ...form, clientSignatureText: text });
                    e.target.value = "";
                  }}
                />
                {form.clientSignatureText ? (
                  <div className="pt-1">
                    {/* eslint-disable-next-line @next/next/no-img-element -- data URL preview */}
                    <img
                      src={form.clientSignatureText}
                      alt=""
                      className="h-10 max-w-50 rounded-md border border-border object-contain object-left"
                    />
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No image yet</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-foreground/90">Contact name</Label>
            <Input
              required
              autoComplete="name"
              placeholder="Jordan Lee"
              className="h-11 border-border/80 bg-background/60"
              value={safeString(form.name)}
              onChange={(e) => onFormChange({ ...form, name: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-foreground/90">Company</Label>
            <Input
              required
              autoComplete="organization"
              placeholder="Acme Industries"
              className="h-11 border-border/80 bg-background/60"
              value={safeString(form.company)}
              onChange={(e) => onFormChange({ ...form, company: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-foreground/90">Email</Label>
            <Input
              required
              type="email"
              autoComplete="email"
              placeholder="hello@company.com"
              className="h-11 border-border/80 bg-background/60"
              value={safeString(form.email)}
              onChange={(e) => onFormChange({ ...form, email: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-foreground/90">Phone</Label>
            <Input
              required
              type="tel"
              autoComplete="tel"
              placeholder="+1 …"
              className="h-11 border-border/80 bg-background/60"
              value={safeString(form.phone)}
              onChange={(e) => onFormChange({ ...form, phone: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-foreground/90">
              Website <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              type="url"
              autoComplete="url"
              placeholder="https://"
              className="h-11 border-border/80 bg-background/60"
              value={safeString(form.website)}
              onChange={(e) => onFormChange({ ...form, website: e.target.value })}
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-foreground/90">Address</Label>
            <Input
              required
              autoComplete="street-address"
              placeholder="Street, city, region"
              className="h-11 border-border/80 bg-background/60"
              value={safeString(form.address)}
              onChange={(e) => onFormChange({ ...form, address: e.target.value })}
            />
          </div>

          <div className="flex items-end sm:col-span-2">
            <Button
              type="submit"
              disabled={saving}
              size="lg"
              className="h-11 rounded-xl font-semibold shadow-md shadow-primary/15"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                  Creating…
                </>
              ) : (
                "Create client"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
