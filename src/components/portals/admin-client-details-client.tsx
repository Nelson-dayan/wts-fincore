"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  Building2,
  FileSpreadsheet,
  FileText,
  FolderKanban,
  Mail,
  MapPin,
  Phone,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils/cn";

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

function StatusBadge({ value }: { value: string }) {
  const normalized = value.toLowerCase();
  let styles =
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset transition-colors duration-150";
  if (
    normalized.includes("complet") ||
    normalized === "paid" ||
    normalized === "approved" ||
    normalized === "active" ||
    normalized === "closed"
  ) {
    styles += cn(
      " bg-emerald-500/10 text-emerald-800 ring-emerald-500/20",
      "dark:text-emerald-400"
    );
  } else if (
    normalized.includes("pend") ||
    normalized.includes("draft") ||
    normalized === "open" ||
    normalized.includes("progress")
  ) {
    styles += cn(
      " bg-amber-500/10 text-amber-900 ring-amber-500/25",
      "dark:text-amber-400"
    );
  } else if (
    normalized.includes("cancel") ||
    normalized.includes("reject") ||
    normalized.includes("void") ||
    normalized.includes("overdue")
  ) {
    styles += " bg-destructive/10 text-destructive ring-destructive/20";
  } else if (normalized.includes("high") || normalized === "urgent") {
    styles += cn(
      " bg-orange-500/10 text-orange-900 ring-orange-500/25",
      "dark:text-orange-400"
    );
  } else if (normalized.includes("low") || normalized === "medium") {
    styles += " bg-slate-500/10 text-slate-700 ring-slate-500/20 dark:text-slate-300";
  } else {
    styles += " bg-muted text-muted-foreground ring-border/60";
  }
  return <span className={styles}>{value}</span>;
}

function renderCell(columnKey: string, raw: unknown): React.ReactNode {
  const val = String(raw ?? "—");
  if (val === "—") return <span className="text-muted-foreground">—</span>;
  if (columnKey === "status" || columnKey === "priority") {
    return <StatusBadge value={val} />;
  }
  if (columnKey === "type") {
    return (
      <span className="inline-flex rounded-md bg-secondary/70 px-2 py-0.5 text-xs font-medium text-secondary-foreground ring-1 ring-border/55 dark:bg-secondary/40">
        {val}
      </span>
    );
  }
  return <span className="text-foreground/95">{val}</span>;
}

function SectionTable({
  title,
  columns,
  rows,
  icon: Icon,
  footerAction,
}: {
  title: string;
  columns: Array<{ key: string; label: string }>;
  rows: Array<Record<string, unknown>>;
  icon: LucideIcon;
  footerAction?: React.ReactNode;
}) {
  return (
    <Card className="group mb-5 border-border/70 bg-card/90 shadow-[var(--shadow-premium)] backdrop-blur-[2px] transition-[box-shadow,border-color] duration-200 hover:border-primary/12 hover:shadow-[var(--shadow-premium-lg)]">
      <CardHeader className="flex flex-col gap-3 space-y-0 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted/80 text-foreground/80 ring-1 ring-border/50 transition-transform duration-200 group-hover:scale-[1.02] dark:bg-muted/45">
            <Icon className="size-[18px]" strokeWidth={1.75} aria-hidden />
          </span>
          <div>
            <CardTitle className="flex flex-wrap items-center gap-2 text-base font-semibold tracking-tight sm:text-lg">
              {title}
              <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-primary ring-1 ring-primary/15">
                {rows.length}
              </span>
            </CardTitle>
            <CardDescription className="mt-1 text-[0.8125rem]">
              Linked records for this client
            </CardDescription>
          </div>
        </div>
        {footerAction ? <div className="flex w-full shrink-0 sm:ml-4 sm:w-auto">{footerAction}</div> : null}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="overflow-hidden rounded-xl border border-border/60 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-[0.8125rem]">
              <thead>
                <tr className="border-b border-border/60 bg-muted/45 dark:bg-muted/25">
                  {columns.map((column) => (
                    <th
                      key={column.key}
                      className="whitespace-nowrap px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="px-4 py-12 text-center text-sm text-muted-foreground"
                    >
                      No records in this section yet.
                    </td>
                  </tr>
                ) : (
                  rows.map((row, idx) => (
                    <tr
                      key={String(row._id ?? idx)}
                      className="bg-card/40 transition-[background-color] duration-150 hover:bg-muted/35 dark:hover:bg-muted/20"
                    >
                      {columns.map((column) => (
                        <td key={column.key} className="px-4 py-3 align-middle">
                          {renderCell(column.key, row[column.key])}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DetailTile({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/50 bg-muted/20 p-4 transition-[border-color,box-shadow] duration-200 hover:border-primary/15 hover:shadow-sm dark:bg-muted/10",
        className
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="mt-2 text-sm font-medium leading-snug text-foreground">{children}</div>
    </div>
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

  const clientName = data.client?.name;

  return (
    <div className="animate-[fade-in_0.4s_ease-out_both]">
      <Link
        href="/admin/clients"
        className="group mb-6 inline-flex items-center gap-2 rounded-lg text-[0.8125rem] font-medium text-muted-foreground transition-[color,background-color] duration-200 hover:bg-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <ArrowLeft
          className="size-4 transition-transform duration-200 group-hover:-translate-x-0.5"
          aria-hidden
        />
        Back to clients
      </Link>

      <DashboardPageHeader
        title={clientName ? clientName : "Client details"}
        description="Full linked flow for this client: projects, quotations, purchase orders, and invoices."
      />

      {error ? (
        <div
          className="mb-6 rounded-2xl border border-destructive/35 bg-destructive/[0.06] p-4 text-[0.8125rem] leading-relaxed text-destructive shadow-sm dark:bg-destructive/[0.1]"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <Card className="mb-6 border-border/70 bg-card/90 shadow-[var(--shadow-premium)] backdrop-blur-[2px]">
        <CardHeader className="space-y-4 pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary ring-1 ring-primary/15">
                <Building2 className="size-6" strokeWidth={1.6} aria-hidden />
              </span>
              <div className="min-w-0 space-y-1">
                <CardTitle className="text-lg font-semibold tracking-tight sm:text-xl">
                  Client profile
                </CardTitle>
                <CardDescription className="text-[0.8125rem] leading-relaxed">
                  {clientName ? (
                    <>
                      <span className="font-medium text-foreground/90">{data.client?.company}</span>
                      {data.client?.createdAt ? (
                        <span className="mt-1 block text-muted-foreground">
                          Client since{" "}
                          <time dateTime={data.client.createdAt}>
                            {new Date(data.client.createdAt).toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </time>
                        </span>
                      ) : null}
                    </>
                  ) : (
                    "Loading profile…"
                  )}
                </CardDescription>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              {editing ? (
                <>
                  <Button size="sm" onClick={saveClient} disabled={saving} className="min-w-[4.5rem]">
                    {saving ? "Saving…" : "Save"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditing(false)} disabled={saving}>
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditing(true)}
                    className="transition-[box-shadow,border-color] duration-200 hover:border-primary/35 hover:bg-primary/5"
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={deleteClient}
                    disabled={saving}
                    className="gap-1.5"
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                    Delete
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
          {editing ? (
            <>
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Client Company</Label>
                <Input
                  value={form.company}
                  onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Website</Label>
                <Input
                  value={form.website}
                  onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Logo Upload</Label>
                <Input
                  type="file"
                  accept="image/*"
                  className="cursor-pointer file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary hover:file:bg-primary/15"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const text = await fileToText(file);
                    setForm((f) => ({ ...f, clientLogoText: text }));
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Signature Upload</Label>
                <Input
                  type="file"
                  accept="image/*"
                  className="cursor-pointer file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary hover:file:bg-primary/15"
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
              <DetailTile label="Name">{data.client?.name ?? "—"}</DetailTile>
              <DetailTile label="Company">{data.client?.company ?? "—"}</DetailTile>
              <DetailTile label="Email">
                {data.client?.email ? (
                  <span className="inline-flex items-center gap-2 break-all">
                    <Mail className="size-3.5 shrink-0 text-primary/70" aria-hidden />
                    {data.client.email}
                  </span>
                ) : (
                  "—"
                )}
              </DetailTile>
              <DetailTile label="Phone">
                {data.client?.phone ? (
                  <span className="inline-flex items-center gap-2 tabular-nums">
                    <Phone className="size-3.5 shrink-0 text-primary/70" aria-hidden />
                    {data.client.phone}
                  </span>
                ) : (
                  "—"
                )}
              </DetailTile>
              <DetailTile label="Website" className="sm:col-span-2">
                {data.client?.website ? (
                  <span className="break-all">{data.client.website}</span>
                ) : (
                  "—"
                )}
              </DetailTile>
              <DetailTile label="Address" className="sm:col-span-2">
                {data.client?.address ? (
                  <span className="inline-flex items-start gap-2">
                    <MapPin className="mt-0.5 size-3.5 shrink-0 text-primary/70" aria-hidden />
                    {data.client.address}
                  </span>
                ) : (
                  "—"
                )}
              </DetailTile>
              <div className="sm:col-span-2 grid gap-4 sm:grid-cols-2">
                <div className="overflow-hidden rounded-xl border border-border/50 bg-muted/15 p-4 dark:bg-muted/10">
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Logo
                  </p>
                  {data.client?.clientLogoText ? (
                    <Image
                      src={data.client.clientLogoText}
                      alt="Client logo"
                      width={180}
                      height={96}
                      unoptimized
                      className="h-24 w-auto rounded-lg border border-border/60 bg-background/80 object-contain shadow-sm transition-transform duration-200 hover:scale-[1.02]"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">No logo uploaded.</p>
                  )}
                </div>
                <div className="overflow-hidden rounded-xl border border-border/50 bg-muted/15 p-4 dark:bg-muted/10">
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Signature
                  </p>
                  {data.client?.clientSignatureText ? (
                    <Image
                      src={data.client.clientSignatureText}
                      alt="Client signature"
                      width={180}
                      height={96}
                      unoptimized
                      className="h-24 w-auto rounded-lg border border-border/60 bg-background/80 object-contain shadow-sm transition-transform duration-200 hover:scale-[1.02]"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">No signature uploaded.</p>
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <SectionTable
        title="Projects"
        icon={FolderKanban}
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
        footerAction={
          <Button size="sm" variant="outline" asChild className="gap-1.5 transition-[box-shadow,border-color] duration-200 hover:border-primary/35 hover:bg-primary/5">
            <Link href={`/admin/projects?clientId=${clientId}`}>View all projects</Link>
          </Button>
        }
      />

      <SectionTable
        title="Quotations"
        icon={FileText}
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
        title="Purchase orders"
        icon={ShoppingCart}
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
        icon={FileSpreadsheet}
        columns={[
          { key: "invoiceNumber", label: "Invoice #" },
          { key: "status", label: "Status" },
          { key: "dueDate", label: "Due Date" },
          { key: "projectId", label: "Project" },
          { key: "createdAt", label: "Created At" },
        ]}
        rows={(data.invoices ?? []).map((invoice) => ({
          ...invoice,
          dueDate: invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "—",
          createdAt: new Date(invoice.createdAt).toLocaleString(),
        }))}
      />
    </div>
  );
}
