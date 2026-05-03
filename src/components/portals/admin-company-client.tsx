"use client";

import { useEffect, useState } from "react";
import { Building2, Landmark, Loader2, Percent, Save } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { UploadCard } from "@/components/ui/upload-card";
import { readResponseJson } from "@/lib/http/read-response-json";

type CompanyData = {
  _id?: string;
  name?: string;
  address?: string;
  contactName?: string;
  email?: string;
  website?: string;
  logoText?: string;
  signatureText?: string;
  isPrimary?: boolean;
  defaultTax?: { taxRate?: number; taxEnabled?: boolean };
};

function s(v: string | undefined | null): string {
  return v ?? "";
}

export function AdminCompanyClient() {
  const [primaryForm, setPrimaryForm] = useState<CompanyData>({
    name: "",
    address: "",
    contactName: "",
    email: "",
    website: "",
    logoText: "",
    signatureText: "",
    defaultTax: { taxRate: 0, taxEnabled: false },
  });
  const [message, setMessage] = useState("");
  const [messageOk, setMessageOk] = useState(true);
  const [pending, setPending] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [bootError, setBootError] = useState("");

  async function loadPrimary(opts?: { quiet?: boolean }) {
    if (!opts?.quiet) {
      setLoadingInitial(true);
      setBootError("");
    }
    try {
      const primaryRes = await fetch("/api/admin/company", { cache: "no-store" });
      const primaryPayload = await readResponseJson<{ item?: CompanyData; message?: string }>(
        primaryRes
      );
      if (!primaryRes.ok) throw new Error(primaryPayload.message ?? "Failed to load company");
      if (primaryPayload.item) setPrimaryForm(primaryPayload.item);
      if (!opts?.quiet) setBootError("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load company";
      if (opts?.quiet) {
        setMessageOk(false);
        setMessage(msg);
      } else {
        setBootError(msg);
      }
    } finally {
      if (!opts?.quiet) setLoadingInitial(false);
    }
  }

  useEffect(() => {
    loadPrimary();
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/company", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(primaryForm),
      });
      const payload = await readResponseJson<{ message?: string }>(response);
      if (!response.ok) throw new Error(payload.message ?? "Failed to update");
      setMessageOk(true);
      setMessage("Saved. Quotations and PDFs will use these details.");
      await loadPrimary({ quiet: true });
    } catch (e) {
      setMessageOk(false);
      setMessage(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="animate-fade-in">
      <DashboardPageHeader
        title="Company"
        description="Your canonical business profile—what clients see on quotations, exports, and team defaults like tax."
      />

      {loadingInitial ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border/80 bg-card/50 py-24 text-muted-foreground">
          <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
          <p className="text-sm font-medium">Loading company profile…</p>
        </div>
      ) : bootError ? (
        <Card className="border-destructive/30 bg-destructive/5 p-8">
          <p className="text-sm font-medium text-destructive">{bootError}</p>
          <Button className="mt-4" variant="outline" onClick={() => loadPrimary()}>
            Retry
          </Button>
        </Card>
      ) : (
        <Card className="overflow-hidden border-border/80 shadow-[0_24px_48px_-24px_rgba(0,0,0,0.18)] dark:shadow-[0_24px_56px_-24px_rgba(0,0,0,0.5)]">
          <div className="h-1 bg-linear-to-r from-primary/80 via-primary to-primary/40" />
          <CardHeader className="border-b border-border/50 bg-muted/10 pb-5 dark:bg-muted/5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary ring-1 ring-primary/20">
                  <Building2 className="size-5" aria-hidden />
                </span>
                <div>
                  <CardTitle className="text-[1.15rem] sm:text-xl">Primary company</CardTitle>
                  <CardDescription className="mt-1.5 max-w-2xl">
                    Legal and contact info, brand marks for documents, and optional default tax for new quotations.
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={onSubmit} className="space-y-10">
              <div>
                <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Landmark className="size-4 text-primary" aria-hidden />
                  Identity & contact
                </h3>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-foreground/90">Company name</Label>
                    <Input
                      className="h-11 border-border/80 bg-background/60"
                      placeholder="Seclance Ltd."
                      value={s(primaryForm.name)}
                      onChange={(e) => setPrimaryForm((f) => ({ ...f, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-foreground/90">Contact name</Label>
                    <Input
                      className="h-11 border-border/80 bg-background/60"
                      placeholder="Operations lead"
                      value={s(primaryForm.contactName)}
                      onChange={(e) => setPrimaryForm((f) => ({ ...f, contactName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-foreground/90">Email</Label>
                    <Input
                      type="email"
                      autoComplete="email"
                      className="h-11 border-border/80 bg-background/60"
                      placeholder="hello@company.com"
                      value={s(primaryForm.email)}
                      onChange={(e) => setPrimaryForm((f) => ({ ...f, email: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-foreground/90">Website</Label>
                    <Input
                      type="url"
                      className="h-11 border-border/80 bg-background/60"
                      placeholder="https://"
                      value={s(primaryForm.website)}
                      onChange={(e) => setPrimaryForm((f) => ({ ...f, website: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-foreground/90">Address</Label>
                    <Input
                      className="h-11 border-border/80 bg-background/60"
                      placeholder="Street, city, postal code"
                      value={s(primaryForm.address)}
                      onChange={(e) => setPrimaryForm((f) => ({ ...f, address: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

                  <div className="space-y-6">
                    {/* Section Header */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-semibold tracking-tight text-foreground">
                          Brand Assets
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          These will appear on generated PDFs and documents
                        </p>
                      </div>
                    </div>

                    {/* Card Container */}
                    <div className="grid gap-5 sm:grid-cols-2">

                      <UploadCard
                        label="Logo"
                        value={primaryForm.logoText}
                        onChange={(val) => setPrimaryForm((f) => ({ ...f, logoText: val }))}
                        placeholder="Upload Logo (PNG, JPG max 2MB)"
                      />

                      <UploadCard
                        label="Signature"
                        value={primaryForm.signatureText}
                        onChange={(val) => setPrimaryForm((f) => ({ ...f, signatureText: val }))}
                        placeholder="Upload Signature"
                      />

                    </div>
                  </div>

              <div>
                <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Percent className="size-4 text-primary" aria-hidden />
                  Quotation defaults
                </h3>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-foreground/90">Default tax rate (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      className="h-11 border-border/80 bg-background/60"
                      value={String(primaryForm.defaultTax?.taxRate ?? 0)}
                      onChange={(e) => {
                        const n = e.target.value === "" ? 0 : Number(e.target.value);
                        setPrimaryForm((f) => ({
                          ...f,
                          defaultTax: {
                            taxRate: Number.isFinite(n) ? n : 0,
                            taxEnabled: f.defaultTax?.taxEnabled ?? false,
                          },
                        }));
                      }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-foreground/90">Tax on by default</Label>
                    <Select
                      className="h-11"
                      value={String(primaryForm.defaultTax?.taxEnabled ?? false)}
                      onChange={(e) =>
                        setPrimaryForm((f) => ({
                          ...f,
                          defaultTax: {
                            taxRate: f.defaultTax?.taxRate ?? 0,
                            taxEnabled: e.target.value === "true",
                          },
                        }))
                      }
                      options={[
                        { value: "false", label: "Off — manual per quote" },
                        { value: "true", label: "On — apply rate above" },
                      ]}
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-border/60 pt-6 sm:flex-row sm:items-center">
                <Button
                  type="submit"
                  disabled={pending}
                  size="lg"
                  className="h-11 rounded-xl font-semibold shadow-md shadow-primary/15"
                >
                  {pending ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 size-4" aria-hidden />
                      Save settings
                    </>
                  )}
                </Button>
                {message ? (
                  <p
                    className={
                      messageOk
                        ? "text-sm text-emerald-600 dark:text-emerald-400"
                        : "text-sm text-destructive"
                    }
                  >
                    {message}
                  </p>
                ) : null}
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
