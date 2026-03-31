"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileSpreadsheet,
  FileText,
  FolderKanban,
  ShoppingCart,
} from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { ClientProfileCard } from "@/components/portals/admin-client-details/client-profile-card";
import { SectionTable } from "@/components/portals/admin-client-details/section-table";
import type { ClientDetailsPayload, ClientProfileForm } from "@/components/portals/admin-client-details/types";

const EMPTY_FORM: ClientProfileForm = {
  name: "",
  company: "",
  email: "",
  phone: "",
  website: "",
  address: "",
  clientLogoText: "",
  clientSignatureText: "",
};

export function AdminClientDetailsClient({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [data, setData] = useState<ClientDetailsPayload>({});
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ClientProfileForm>(EMPTY_FORM);

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
    <div className="animate-fade-in">
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
          className="mb-6 rounded-2xl border border-destructive/35 bg-destructive/6 p-4 text-[0.8125rem] leading-relaxed text-destructive shadow-sm dark:bg-destructive/10"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <ClientProfileCard
        data={data}
        editing={editing}
        saving={saving}
        form={form}
        onFormChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
        onSave={saveClient}
        onCancel={() => setEditing(false)}
        onStartEdit={() => setEditing(true)}
        onDelete={deleteClient}
      />

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
        actionHref={`/admin/projects?clientId=${clientId}`}
        actionLabel="View all projects"
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
