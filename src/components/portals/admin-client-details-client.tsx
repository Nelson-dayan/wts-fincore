"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ClientDetailsPayload = {
  client?: {
    _id: string;
    name: string;
    company: string;
    email: string;
    phone: string;
    website?: string;
    address?: string;
    clientLogoText?: string;
    clientSignatureText?: string;
    createdAt: string;
  };
  projects?: Array<{
    _id: string;
    name: string;
    status: string;
    priority: string;
    createdAt: string;
  }>;
  quotations?: Array<{
    _id: string;
    quotationNumber: string;
    status: string;
    projectId: string;
    createdAt: string;
  }>;
  purchaseOrders?: Array<{
    _id: string;
    poNumber: string;
    type: string;
    status: string;
    projectId: string;
    createdAt: string;
  }>;
  invoices?: Array<{
    _id: string;
    invoiceNumber: string;
    status: string;
    dueDate?: string;
    projectId: string;
    createdAt: string;
  }>;
  message?: string;
};

function SectionTable({
  title,
  columns,
  rows,
}: {
  title: string;
  columns: Array<{ key: string; label: string }>;
  rows: Array<Record<string, unknown>>;
}) {
  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-base">
          {title} ({rows.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-muted-foreground">
              <tr>
                {columns.map((column) => (
                  <th key={column.key} className="py-2 pr-3">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={String(row._id ?? idx)} className="border-t border-border/70">
                  {columns.map((column) => (
                    <td key={column.key} className="py-2 pr-3">
                      {String(row[column.key] ?? "-")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export function AdminClientDetailsClient({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [data, setData] = useState<ClientDetailsPayload>({});
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    website: "",
    address: "",
    clientLogoText: "",
    clientSignatureText: "",
  });

  async function fileToText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  }

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const response = await fetch(`/api/admin/clients/${clientId}/details`, {
          cache: "no-store",
        });
        const payload = (await response.json()) as ClientDetailsPayload;
        if (!response.ok) throw new Error(payload.message ?? "Failed to load details");
        if (alive) {
          setData(payload);
          if (payload.client) {
            setForm({
              name: payload.client.name ?? "",
              company: payload.client.company ?? "",
              email: payload.client.email ?? "",
              phone: payload.client.phone ?? "",
              website: payload.client.website ?? "",
              address: payload.client.address ?? "",
              clientLogoText: payload.client.clientLogoText ?? "",
              clientSignatureText: payload.client.clientSignatureText ?? "",
            });
          }
        }
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Failed to load details");
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, [clientId]);

  async function saveClient() {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/clients/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(payload.message ?? "Failed to update client");
      setEditing(false);
      router.refresh();
      const refreshed = await fetch(`/api/admin/clients/${clientId}/details`, {
        cache: "no-store",
      });
      const details = (await refreshed.json()) as ClientDetailsPayload;
      setData(details);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update client");
    } finally {
      setSaving(false);
    }
  }

  async function deleteClient() {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/clients/${clientId}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(payload.message ?? "Failed to delete client");
      router.push("/admin/clients");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete client");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="animate-[fade-in_0.4s_ease-out_both]">
      <DashboardPageHeader
        title={data.client?.name ? `Client: ${data.client.name}` : "Client Details"}
        description="Full linked flow for this client: projects, quotations, purchase orders, and invoices."
      />
      {error ? (
        <div className="mb-4 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <Card className="mb-4">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base">Client Profile</CardTitle>
            <div className="flex gap-2">
              {editing ? (
                <>
                  <Button size="sm" onClick={saveClient} disabled={saving}>
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditing(false)}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={deleteClient}
                    disabled={saving}
                  >
                    Delete
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          {editing ? (
            <>
              <div className="space-y-1">
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Client Company</Label>
                <Input value={form.company} onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Website</Label>
                <Input value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Address</Label>
                <Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Logo Upload</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const text = await fileToText(file);
                    setForm((f) => ({ ...f, clientLogoText: text }));
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label>Signature Upload</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const text = await fileToText(file);
                    setForm((f) => ({ ...f, clientSignatureText: text }));
                  }}
                />
              </div>
            </>
          ) : (
            <>
              <p><strong>Name:</strong> {data.client?.name ?? "-"}</p>
              <p><strong>Client Company:</strong> {data.client?.company ?? "-"}</p>
              <p><strong>Email:</strong> {data.client?.email ?? "-"}</p>
              <p><strong>Phone:</strong> {data.client?.phone ?? "-"}</p>
              <p><strong>Website:</strong> {data.client?.website ?? "-"}</p>
              <p><strong>Address:</strong> {data.client?.address ?? "-"}</p>
              <div className="sm:col-span-2 grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="mb-1"><strong>Logo</strong></p>
                  {data.client?.clientLogoText ? (
                    <Image
                      src={data.client.clientLogoText}
                      alt="Client logo"
                      width={180}
                      height={96}
                      unoptimized
                      className="h-24 w-auto rounded-md border border-border bg-muted/20"
                    />
                  ) : (
                    <p className="text-muted-foreground">No logo uploaded.</p>
                  )}
                </div>
                <div>
                  <p className="mb-1"><strong>Signature</strong></p>
                  {data.client?.clientSignatureText ? (
                    <Image
                      src={data.client.clientSignatureText}
                      alt="Client signature"
                      width={180}
                      height={96}
                      unoptimized
                      className="h-24 w-auto rounded-md border border-border bg-muted/20"
                    />
                  ) : (
                    <p className="text-muted-foreground">No signature uploaded.</p>
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <SectionTable
        title="Projects"
        columns={[
          { key: "name", label: "Name" },
          { key: "status", label: "Status" },
          { key: "priority", label: "Priority" },
          { key: "createdAt", label: "Created At" },
        ]}
        rows={(data.projects ?? []).map((project) => ({
          ...project,
          createdAt: new Date(project.createdAt).toLocaleString(),
        }))}
      />
      <div className="mb-4 flex justify-end">
        <Link href={`/admin/projects?clientId=${clientId}`}>
          <Button size="sm" variant="outline">View All Projects</Button>
        </Link>
      </div>

      <SectionTable
        title="Quotations"
        columns={[
          { key: "quotationNumber", label: "Quotation #" },
          { key: "status", label: "Status" },
          { key: "projectId", label: "Project" },
          { key: "createdAt", label: "Created At" },
        ]}
        rows={(data.quotations ?? []).map((quotation) => ({
          ...quotation,
          createdAt: new Date(quotation.createdAt).toLocaleString(),
        }))}
      />

      <SectionTable
        title="Purchase Orders"
        columns={[
          { key: "poNumber", label: "PO #" },
          { key: "type", label: "Type" },
          { key: "status", label: "Status" },
          { key: "projectId", label: "Project" },
          { key: "createdAt", label: "Created At" },
        ]}
        rows={(data.purchaseOrders ?? []).map((po) => ({
          ...po,
          createdAt: new Date(po.createdAt).toLocaleString(),
        }))}
      />

      <SectionTable
        title="Invoices"
        columns={[
          { key: "invoiceNumber", label: "Invoice #" },
          { key: "status", label: "Status" },
          { key: "dueDate", label: "Due Date" },
          { key: "projectId", label: "Project" },
          { key: "createdAt", label: "Created At" },
        ]}
        rows={(data.invoices ?? []).map((invoice) => ({
          ...invoice,
          dueDate: invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "-",
          createdAt: new Date(invoice.createdAt).toLocaleString(),
        }))}
      />
    </div>
  );
}
