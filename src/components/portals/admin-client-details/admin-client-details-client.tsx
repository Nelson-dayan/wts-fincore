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
  Wallet,
} from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { DEFAULT_CURRENCY } from "@/lib/constants/finance";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ClientProfileCard } from "@/components/portals/admin-client-details/client-profile-card";
import { ClientContactsCard } from "@/components/portals/admin-client-details/client-contacts-card";
import { SectionTable } from "@/components/portals/admin-client-details/section-table";
import { ClientStatementModal } from "@/components/portals/admin-client-details/client-statement-modal";
import type { ClientDetailsPayload, ClientProfileForm } from "@/components/portals/admin-client-details/types";
import { readResponseJson } from "@/lib/http/read-response-json";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SaveSuccessToast } from "@/components/ui/save-success-toast";
import { useSaveFeedback } from "@/lib/hooks/use-save-feedback";
import { formatCurrency } from "@/lib/utils/formatters";

const EMPTY_FORM: ClientProfileForm = {
  name: "",
  company: "",
  email: "",
  phone: "",
  website: "",
  address: "",
  clientLogoText: "",
  clientSignatureText: "",
  taxId: "",
  currency: "AED",
  paymentTerms: "",
  notes: "",
  billingAddress: "",
  shippingAddress: "",
  country: "",
  state: "",
  city: "",
  zipCode: "",
};

export function AdminClientDetailsClient({ clientId }: { clientId: string }) {
  const router = useRouter();
  const { successMessage, clearSaveFeedback, showSaveSuccess } = useSaveFeedback();
  const [data, setData] = useState<ClientDetailsPayload>({});
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ClientProfileForm>(EMPTY_FORM);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [statementOpen, setStatementOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const response = await fetch(`/api/admin/clients/${clientId}/details`, {
          cache: "no-store",
        });
        const payload = await readResponseJson<ClientDetailsPayload>(response);
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
              taxId: payload.client.taxId ?? "",
              currency: payload.client.currency ?? "AED",
              paymentTerms: payload.client.paymentTerms ?? "",
              notes: payload.client.notes ?? "",
              billingAddress: payload.client.billingAddress ?? "",
              shippingAddress: payload.client.shippingAddress ?? "",
              country: payload.client.country ?? "",
              state: payload.client.state ?? "",
              city: payload.client.city ?? "",
              zipCode: payload.client.zipCode ?? "",
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

  async function saveClient(): Promise<boolean> {
    setSaving(true);
    setError("");
    clearSaveFeedback();
    try {
      const response = await fetch(`/api/admin/clients/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await readResponseJson<{ message?: string }>(response);
      if (!response.ok) throw new Error(payload.message ?? "Failed to update client");
      setEditing(false);
      router.refresh();
      const refreshed = await fetch(`/api/admin/clients/${clientId}/details`, {
        cache: "no-store",
      });
      const details = await readResponseJson<ClientDetailsPayload>(refreshed);
      setData(details);
      showSaveSuccess();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update client");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function deleteClient(): Promise<boolean> {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/clients/${clientId}`, {
        method: "DELETE",
      });
      const payload = await readResponseJson<{ message?: string }>(response);
      if (!response.ok) throw new Error(payload.message ?? "Failed to delete client");
      router.replace("/admin/clients");
      router.refresh();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete client");
      return false;
    } finally {
      setSaving(false);
    }
  }

  const clientName = data.client?.name;

  return (
    <div className="animate-fade-in">
      <SaveSuccessToast message={successMessage} />
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

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete this client?"
        description="This cannot be undone. Deletion is blocked if the client still has linked projects."
        confirmLabel="Delete"
        variant="destructive"
        loading={saving}
        onConfirm={async () => {
          const ok = await deleteClient();
          if (ok) setDeleteConfirmOpen(false);
        }}
      />

      <ClientProfileCard
        data={data}
        editing={editing}
        saving={saving}
        form={form}
        onFormChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
        onSave={() => void saveClient()}
        onCancel={() => setEditing(false)}
        onStartEdit={() => setEditing(true)}
        onDelete={() => setDeleteConfirmOpen(true)}
        onOpenStatement={() => setStatementOpen(true)}
      />

      <div className="mb-6">
        <ClientContactsCard clientId={clientId} clientName={clientName} />
      </div>

      <Card className="mb-6 border-border/70 bg-card/90 shadow-(--shadow-premium) backdrop-blur-[2px]">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Wallet className="size-4 text-primary" />
            Expenses (all projects)
          </CardTitle>
          <CardDescription>
            Total recorded expenses linked to this client’s projects.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
            {formatCurrency(data.expenseTotalAll ?? 0, data.client?.currency || "AED")}
          </p>
        </CardContent>
      </Card>

      <SectionTable
        title="Projects"
        icon={FolderKanban}
        columns={[
          { key: "name", label: "Name" },
          { key: "status", label: "Status" },
          { key: "priority", label: "Priority" },
          { key: "expenseTotal", label: "Expenses" },
          { key: "createdAt", label: "Created At" },
        ]}
        rows={(data.projects ?? []).map((project) => ({
          ...project,
          expenseTotal: formatCurrency(project.expenseTotal ?? 0, data.client?.currency || "AED"),
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
        rows={(data.quotations ?? []).map((quotation) => {
          const pId = typeof quotation.projectId === "object" && quotation.projectId !== null 
            ? String((quotation.projectId as any)._id ?? "") 
            : String(quotation.projectId ?? "");
          const projName = data.projects?.find(p => String(p._id) === pId)?.name || "—";
          return {
            ...quotation,
            projectId: projName,
            createdAt: new Date(quotation.createdAt).toLocaleString(),
          };
        })}
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
        rows={(data.purchaseOrders ?? []).map((po) => {
          const pId = typeof po.projectId === "object" && po.projectId !== null 
            ? String((po.projectId as any)._id ?? "") 
            : String(po.projectId ?? "");
          const projName = data.projects?.find(p => String(p._id) === pId)?.name || "—";
          return {
            ...po,
            projectId: projName,
            createdAt: new Date(po.createdAt).toLocaleString(),
          };
        })}
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
        rows={(data.invoices ?? []).map((invoice) => {
          const pId = typeof invoice.projectId === "object" && invoice.projectId !== null 
            ? String((invoice.projectId as any)._id ?? "") 
            : String(invoice.projectId ?? "");
          const projName = data.projects?.find(p => String(p._id) === pId)?.name || "—";
          return {
            ...invoice,
            projectId: projName,
            dueDate: invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "—",
            createdAt: new Date(invoice.createdAt).toLocaleString(),
          };
        })}
      />

      <SectionTable
        title="Expenses"
        icon={Wallet}
        columns={[
          { key: "title", label: "Title" },
          { key: "amount", label: "Amount" },
          { key: "category", label: "Category" },
          { key: "projectName", label: "Project" },
          { key: "createdAt", label: "Created At" },
        ]}
        rows={(data.expenses ?? []).map((row) => ({
          ...row,
          amount: formatCurrency(row.amount, (row as any).currency || data.client?.currency || "AED"),
          createdAt: new Date(String(row.createdAt)).toLocaleString(),
        }))}
        actionHref="/admin/expenses"
        actionLabel="View all expenses"
      />
      <ClientStatementModal 
        clientId={clientId}
        isOpen={statementOpen}
        onClose={() => setStatementOpen(false)}
        apiPrefix="/api/admin"
      />
    </div>
  );
}
