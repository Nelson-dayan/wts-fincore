"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Landmark, Loader2, Save } from "lucide-react";
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
};

function s(v: string | undefined | null): string {
  return v ?? "";
}

export function AdminCompanyClient() {
  const router = useRouter();
  const [primaryForm, setPrimaryForm] = useState<CompanyData>({
    name: "",
    address: "",
    contactName: "",
    email: "",
    website: "",
    logoText: "",
    signatureText: "",
  });
  const [initialForm, setInitialForm] = useState<CompanyData>({
    name: "",
    address: "",
    contactName: "",
    email: "",
    website: "",
    logoText: "",
    signatureText: "",
  });
  const [message, setMessage] = useState("");
  const [messageOk, setMessageOk] = useState(true);
  const [pending, setPending] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [bootError, setBootError] = useState("");

  const isChanged = 
    s(primaryForm.name) !== s(initialForm.name) ||
    s(primaryForm.address) !== s(initialForm.address) ||
    s(primaryForm.contactName) !== s(initialForm.contactName) ||
    s(primaryForm.email) !== s(initialForm.email) ||
    s(primaryForm.website) !== s(initialForm.website) ||
    s(primaryForm.logoText) !== s(initialForm.logoText) ||
    s(primaryForm.signatureText) !== s(initialForm.signatureText);

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
      if (primaryPayload.item) {
        const data = {
          name: primaryPayload.item.name ?? "",
          address: primaryPayload.item.address ?? "",
          contactName: primaryPayload.item.contactName ?? "",
          email: primaryPayload.item.email ?? "",
          website: primaryPayload.item.website ?? "",
          logoText: primaryPayload.item.logoText ?? "",
          signatureText: primaryPayload.item.signatureText ?? "",
        };
        setPrimaryForm(data);
        setInitialForm(data);
      }
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
      router.refresh();
    } catch (e) {
      setMessageOk(false);
      setMessage(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="animate-fade-in space-y-8">

      <DashboardPageHeader
        title="Company Workspace"
        description="Manage your organization identity, branding, and operational defaults."
      />

      {loadingInitial ? (
        <div className="flex min-h-[500px] items-center justify-center rounded-[32px] border border-border/50 bg-background/70 backdrop-blur">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <div className="text-center">
              <h3 className="text-lg font-semibold">
                Loading Workspace
              </h3>
              <p className="text-sm text-muted-foreground">
                Preparing company profile...
              </p>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">

          {/* LEFT SIDE */}
          <div className="space-y-6">

            {/* Workspace Hero */}
            <div className="relative overflow-hidden rounded-[32px] border border-border/50 bg-background p-8 shadow-2xl">

              {/* Background Glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />

              <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">

                {/* Company Identity */}
                <div className="flex items-center gap-6">

                  {/* Logo */}
                  <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-[28px] border border-border/50 bg-muted/30 shadow-inner">
                    {primaryForm.logoText ? (
                      <img
                        src={primaryForm.logoText}
                        alt="Company Logo"
                        className="h-20 w-20 object-contain"
                      />
                    ) : (
                      <Building2 className="h-12 w-12 text-primary" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="space-y-3">

                    <div>
                      <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                        Organization
                      </p>

                      <h1 className="mt-2 text-4xl font-bold tracking-tight">
                        {primaryForm.name || "Your Company"}
                      </h1>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">

                      {primaryForm.email && (
                        <span>{primaryForm.email}</span>
                      )}

                      {primaryForm.website && (
                        <>
                          <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                          <span>{primaryForm.website}</span>
                        </>
                      )}
                    </div>

                    <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                      Primary Workspace
                    </div>
                  </div>
                </div>

                {/* Save */}
                <div className="flex items-center gap-3">

                  <Button
                    type="submit"
                    disabled={pending || !isChanged}
                    size="lg"
                    className="h-14 rounded-2xl px-7 text-sm font-semibold shadow-xl shadow-primary/20"
                  >
                    {pending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Main Form */}
            <div className="grid gap-6 lg:grid-cols-2">

              {/* Identity */}
              <div className="rounded-[28px] border border-border/50 bg-background p-6 shadow-sm">

                <div className="mb-6">
                  <h3 className="text-lg font-semibold">
                    Identity
                  </h3>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Legal and public organization details.
                  </p>
                </div>

                <div className="space-y-5">

                  <div className="space-y-2">
                    <Label>Company Name</Label>

                    <Input
                      className="h-12 rounded-2xl border-border/70 bg-muted/20"
                      value={s(primaryForm.name)}
                      onChange={(e) =>
                        setPrimaryForm((f) => ({
                          ...f,
                          name: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Contact Name</Label>

                    <Input
                      className="h-12 rounded-2xl border-border/70 bg-muted/20"
                      value={s(primaryForm.contactName)}
                      onChange={(e) =>
                        setPrimaryForm((f) => ({
                          ...f,
                          contactName: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Email Address</Label>

                    <Input
                      type="email"
                      className="h-12 rounded-2xl border-border/70 bg-muted/20"
                      value={s(primaryForm.email)}
                      onChange={(e) =>
                        setPrimaryForm((f) => ({
                          ...f,
                          email: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Business Details */}
              <div className="rounded-[28px] border border-border/50 bg-background p-6 shadow-sm">

                <div className="mb-6">
                  <h3 className="text-lg font-semibold">
                    Business Details
                  </h3>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Workspace links and address information.
                  </p>
                </div>

                <div className="space-y-5">

                  <div className="space-y-2">
                    <Label>Website</Label>

                    <Input
                      className="h-12 rounded-2xl border-border/70 bg-muted/20"
                      value={s(primaryForm.website)}
                      onChange={(e) =>
                        setPrimaryForm((f) => ({
                          ...f,
                          website: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Address</Label>

                    <textarea
                      className="min-h-[140px] w-full rounded-2xl border border-border/70 bg-muted/20 px-4 py-3 text-sm outline-none transition focus:border-primary"
                      value={s(primaryForm.address)}
                      onChange={(e) =>
                        setPrimaryForm((f) => ({
                          ...f,
                          address: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR */}
          <div className="space-y-6">

            {/* Assets */}
            <div className="rounded-[32px] border border-border/50 bg-background p-6 shadow-xl">

              <div className="mb-6">
                <h3 className="text-lg font-semibold">
                  Brand Assets
                </h3>

                <p className="mt-1 text-sm text-muted-foreground">
                  Branding used on invoices and exports.
                </p>
              </div>

              <div className="space-y-5">

                <UploadCard
                  label="Company Logo"
                  value={primaryForm.logoText}
                  onChange={(val) =>
                    setPrimaryForm((f) => ({
                      ...f,
                      logoText: val,
                    }))
                  }
                  placeholder="Upload logo"
                />

                <UploadCard
                  label="Signature"
                  value={primaryForm.signatureText}
                  onChange={(val) =>
                    setPrimaryForm((f) => ({
                      ...f,
                      signatureText: val,
                    }))
                  }
                  placeholder="Upload signature"
                />
              </div>
            </div>

            {/* Status */}
            <div className="rounded-[32px] border border-border/50 bg-background p-6 shadow-sm">

              <div className="flex items-center gap-3">

                <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />

                <div>
                  <h4 className="font-medium">
                    Workspace Active
                  </h4>

                  <p className="text-sm text-muted-foreground">
                    All systems operational
                  </p>
                </div>
              </div>

              {message && (
                <div
                  className={`mt-5 rounded-2xl border p-4 text-sm ${messageOk
                    ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400"
                    : "border-destructive/20 bg-destructive/5 text-destructive"
                    }`}
                >
                  {message}
                </div>
              )}
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
