"use client";

import { useEffect, useState } from "react";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  const [pending, setPending] = useState(false);

  async function fileToText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  }

  async function loadPrimary() {
    const primaryRes = await fetch("/api/admin/company", { cache: "no-store" });
    const primaryPayload = (await primaryRes.json()) as { item?: CompanyData };
    if (primaryPayload.item) setPrimaryForm(primaryPayload.item);
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
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(payload.message ?? "Failed to update");
      setMessage("Primary company settings saved.");
      await loadPrimary();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="animate-[fade-in_0.4s_ease-out_both]">
      <DashboardPageHeader
        title="Company Settings"
        description="Manage company profile used across clients and documents."
      />
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base">Edit Company Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input
                value={primaryForm.name ?? ""}
                onChange={(e) =>
                  setPrimaryForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Contact Name</Label>
              <Input
                value={primaryForm.contactName ?? ""}
                onChange={(e) =>
                  setPrimaryForm((f) => ({ ...f, contactName: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input
                type="email"
                value={primaryForm.email ?? ""}
                onChange={(e) =>
                  setPrimaryForm((f) => ({ ...f, email: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Website</Label>
              <Input
                value={primaryForm.website ?? ""}
                onChange={(e) =>
                  setPrimaryForm((f) => ({ ...f, website: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Address</Label>
              <Input
                value={primaryForm.address ?? ""}
                onChange={(e) =>
                  setPrimaryForm((f) => ({ ...f, address: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Logo Upload (stored as text)</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const text = await fileToText(file);
                  setPrimaryForm((f) => ({ ...f, logoText: text }));
                }}
              />
            </div>
            <div className="space-y-1">
              <Label>Signature Upload (stored as text)</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const text = await fileToText(file);
                  setPrimaryForm((f) => ({ ...f, signatureText: text }));
                }}
              />
            </div>
            <div className="space-y-1">
              <Label>Default Tax Rate</Label>
              <Input
                type="number"
                value={primaryForm.defaultTax?.taxRate ?? 0}
                onChange={(e) =>
                  setPrimaryForm((f) => ({
                    ...f,
                    defaultTax: {
                      taxRate: Number(e.target.value || 0),
                      taxEnabled: f.defaultTax?.taxEnabled ?? false,
                    },
                  }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Tax Enabled</Label>
              <select
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm shadow-sm"
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
              >
                <option value="true">Enabled</option>
                <option value="false">Disabled</option>
              </select>
            </div>
            <div className="sm:col-span-2 flex items-center gap-3">
              <Button type="submit" disabled={pending}>
                {pending ? "Saving..." : "Save Settings"}
              </Button>
              {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
