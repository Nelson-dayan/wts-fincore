"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { readResponseJson } from "@/lib/http/read-response-json";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SaveConfirmModal } from "@/components/ui/save-confirm-modal";
import { AdminInvoicesCreateHelper } from "@/components/portals/admin-invoices-create-helper";


type ProjectDetailsPayload = {
  project?: {
    _id: string;
    name: string;
    description?: string;
    status: "lead" | "in_progress" | "completed" | "on_hold";
    priority: "low" | "medium" | "high";
    budget?: unknown;
    clientId: string;
    currency?: string;
    category?: string;
    clientReference?: string;
    notes?: string;
    startDate?: string;
    targetEndDate?: string;
    actualEndDate?: string;
    createdAt: string;
  };
  client?: {
    _id: string;
    name: string;
    company: string;
    email: string;
  };
  quotations?: Array<{ _id: string; quotationNumber: string; status: string; createdAt: string }>;
  purchaseOrders?: Array<{ _id: string; poNumber: string; type: string; status: string; createdAt: string }>;
  invoices?: Array<{ _id: string; invoiceNumber: string; status: string; dueDate?: string; createdAt: string }>;
  expenses?: Array<{
    _id: string;
    title: string;
    amount: number;
    category: string;
    createdAt: string;
  }>;
  expenseTotal?: number;
  financials?: {
    totalReceivedBase: number;
    totalFeesBase: number;
    totalExpensesBase: number;
    profitBase: number;
  };
  message?: string;
};

function normalizeBudget(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const maybeDecimal = value as { $numberDecimal?: string; toString?: () => string };
    if (maybeDecimal.$numberDecimal) return maybeDecimal.$numberDecimal;
    if (typeof maybeDecimal.toString === "function") {
      const parsed = maybeDecimal.toString();
      if (parsed !== "[object Object]") return parsed;
    }
  }
  return "";
}

function formatAed(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function SectionTable({
  title,
  rows,
  columns,
}: {
  title: string;
  rows: Array<Record<string, unknown>>;
  columns: Array<{ key: string; label: string }>;
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
          <table className="w-full min-w-170 text-left text-sm">
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
              {rows.map((row, i) => (
                <tr key={String(row._id ?? i)} className="border-t border-border/70">
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

export function AdminProjectDetailsClient({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [data, setData] = useState<ProjectDetailsPayload>({});
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    status: "lead" as "lead" | "in_progress" | "completed" | "on_hold",
    priority: "medium" as "low" | "medium" | "high",
    budget: "",
    currency: "AED",
    category: "",
    clientReference: "",
    notes: "",
    startDate: "",
    targetEndDate: "",
    actualEndDate: "",
  });
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch(`/api/admin/projects/${encodeURIComponent(projectId)}`, {
      cache: "no-store",
    });
    const raw = await response.text();
    let payload: ProjectDetailsPayload;
    try {
      payload = JSON.parse(raw) as ProjectDetailsPayload;
    } catch {
      throw new Error(
        response.ok
          ? "Invalid response from server"
          : `Failed to load details (HTTP ${response.status})`
      );
    }
    if (!response.ok) throw new Error(payload.message ?? "Failed to load details");
    setData(payload);
    if (payload.project) {
      const normalizedBudget = normalizeBudget(payload.project.budget);
      setForm({
        name: payload.project.name ?? "",
        description: payload.project.description ?? "",
        status: payload.project.status ?? "lead",
        priority: payload.project.priority ?? "medium",
        budget: normalizedBudget,
        currency: payload.project.currency ?? "AED",
        category: payload.project.category ?? "",
        clientReference: payload.project.clientReference ?? "",
        notes: payload.project.notes ?? "",
        startDate: payload.project.startDate ? new Date(payload.project.startDate).toISOString().split('T')[0] : "",
        targetEndDate: payload.project.targetEndDate ? new Date(payload.project.targetEndDate).toISOString().split('T')[0] : "",
        actualEndDate: payload.project.actualEndDate ? new Date(payload.project.actualEndDate).toISOString().split('T')[0] : "",
      });
    }
  }, [projectId]);

  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : "Failed to load details"));
  }, [load]);

  async function saveProject(): Promise<boolean> {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          status: form.status,
          priority: form.priority,
          budget: Number(form.budget || 0),
          currency: form.currency,
          category: form.category,
          clientReference: form.clientReference,
          notes: form.notes,
          startDate: form.startDate || undefined,
          targetEndDate: form.targetEndDate || undefined,
          actualEndDate: form.actualEndDate || undefined,
        }),
      });
      const payload = await readResponseJson<{ message?: string }>(response);
      if (!response.ok) throw new Error(payload.message ?? "Failed to update project");
      setEditing(false);
      await load();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update project");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function deleteProject(): Promise<boolean> {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/projects/${projectId}`, {
        method: "DELETE",
      });
      const payload = await readResponseJson<{ message?: string }>(response);
      if (!response.ok) throw new Error(payload.message ?? "Failed to delete project");
      const parentClientId = data.project?.clientId?.trim();
      router.replace(
        parentClientId
          ? `/admin/clients/${encodeURIComponent(parentClientId)}`
          : "/admin/projects"
      );
      router.refresh();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete project");
      return false;
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="animate-fade-in">
      <SaveConfirmModal
        open={saveConfirmOpen}
        onClose={() => setSaveConfirmOpen(false)}
        onConfirm={async () => {
          const ok = await saveProject();
          if (ok) setSaveConfirmOpen(false);
        }}
        loading={saving}
        entityName="project"
      />
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete this project?"
        description="This cannot be undone. Deletion is blocked if linked records prevent removal."
        confirmLabel="Delete"
        variant="destructive"
        loading={saving}
        onConfirm={async () => {
          const ok = await deleteProject();
          if (ok) setDeleteConfirmOpen(false);
        }}
      />
      <DashboardPageHeader
        title={data.project?.name ? `Project: ${data.project.name}` : "Project Details"}
        description="Project profile with linked quotations, purchase orders, and invoices."
      />
      {error ? (
        <div className="mb-4 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}
      <Card className="mb-4">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">Project Profile</CardTitle>
            <div className="flex gap-2">
              {editing ? (
                <>
                  <Button size="sm" onClick={() => setSaveConfirmOpen(true)} disabled={saving}>
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => setDeleteConfirmOpen(true)} disabled={saving}>
                    Delete
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {editing ? (
            <>
              <div className="space-y-2 sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Core Info</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Project Name</label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Client Reference / PO</label>
                <Input value={form.clientReference} onChange={(e) => setForm((f) => ({ ...f, clientReference: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <Select
                  value={form.status}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, status: e.target.value as typeof f.status }))
                  }
                  options={[
                    { value: "lead", label: "Lead" },
                    { value: "in_progress", label: "In Progress" },
                    { value: "completed", label: "Completed" },
                    { value: "on_hold", label: "On Hold" },
                  ]}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Category</label>
                <Input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder="e.g. Retainer, Fixed Price" />
              </div>

              <div className="space-y-2 sm:col-span-2 mt-2 pt-2 border-t">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Financial & Priority</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Budget</label>
                <Input type="number" value={form.budget} onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Currency</label>
                <Input value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))} placeholder="AED" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Priority</label>
                <Select
                  value={form.priority}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, priority: e.target.value as typeof f.priority }))
                  }
                  options={[
                    { value: "low", label: "Low" },
                    { value: "medium", label: "Medium" },
                    { value: "high", label: "High" },
                  ]}
                />
              </div>

              <div className="space-y-2 sm:col-span-2 mt-2 pt-2 border-t">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Timeline</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Start Date</label>
                <Input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Target End Date</label>
                <Input type="date" value={form.targetEndDate} onChange={(e) => setForm((f) => ({ ...f, targetEndDate: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Actual End Date</label>
                <Input type="date" value={form.actualEndDate} onChange={(e) => setForm((f) => ({ ...f, actualEndDate: e.target.value }))} />
              </div>

              <div className="space-y-2 sm:col-span-2 mt-2 pt-2 border-t">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Additional Details</p>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Description</label>
                <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Internal Notes</label>
                <Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Private notes..." />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1 border p-3 rounded-lg bg-muted/10">
                <p className="text-[10px] uppercase font-semibold text-muted-foreground">Name</p>
                <p className="font-medium text-sm">{data.project?.name ?? "-"}</p>
              </div>
              <div className="space-y-1 border p-3 rounded-lg bg-muted/10">
                <p className="text-[10px] uppercase font-semibold text-muted-foreground">Client</p>
                <p className="font-medium text-sm">{data.client ? `${data.client.name} (${data.client.company})` : "-"}</p>
              </div>
              <div className="space-y-1 border p-3 rounded-lg bg-muted/10">
                <p className="text-[10px] uppercase font-semibold text-muted-foreground">Status & Priority</p>
                <p className="font-medium text-sm capitalize">{data.project?.status?.replace('_', ' ') ?? "-"} • {data.project?.priority ?? "-"}</p>
              </div>
              <div className="space-y-1 border p-3 rounded-lg bg-muted/10">
                <p className="text-[10px] uppercase font-semibold text-muted-foreground">Category</p>
                <p className="font-medium text-sm">{data.project?.category || "-"}</p>
              </div>
              <div className="space-y-1 border p-3 rounded-lg bg-muted/10">
                <p className="text-[10px] uppercase font-semibold text-muted-foreground">Budget</p>
                <p className="font-medium text-sm">{data.project?.currency || "AED"} {normalizeBudget(data.project?.budget) || "-"}</p>
              </div>
              <div className="space-y-1 border p-3 rounded-lg bg-muted/10">
                <p className="text-[10px] uppercase font-semibold text-muted-foreground">Client Reference</p>
                <p className="font-medium text-sm">{data.project?.clientReference || "-"}</p>
              </div>
              
              <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4 border p-3 rounded-lg bg-muted/10">
                <div>
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground">Start Date</p>
                  <p className="font-medium text-sm">{data.project?.startDate ? new Date(data.project.startDate).toLocaleDateString() : "-"}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground">Target End Date</p>
                  <p className="font-medium text-sm">{data.project?.targetEndDate ? new Date(data.project.targetEndDate).toLocaleDateString() : "-"}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground">Actual End Date</p>
                  <p className="font-medium text-sm">{data.project?.actualEndDate ? new Date(data.project.actualEndDate).toLocaleDateString() : "-"}</p>
                </div>
              </div>

              <div className="sm:col-span-2 space-y-1 border p-3 rounded-lg bg-muted/10">
                <p className="text-[10px] uppercase font-semibold text-muted-foreground">Description</p>
                <p className="text-sm">{data.project?.description || "-"}</p>
              </div>
              <div className="sm:col-span-2 space-y-1 border p-3 rounded-lg bg-muted/10">
                <p className="text-[10px] uppercase font-semibold text-muted-foreground">Internal Notes</p>
                <p className="text-sm">{data.project?.notes || "-"}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="mb-2 flex flex-wrap justify-end gap-2">
        <Link href={`/admin/quotations?projectId=${projectId}#quotation-builder`}>
          <Button size="sm">Create quotation</Button>
        </Link>
        <Link href={`/admin/quotations?projectId=${projectId}`}>
          <Button size="sm" variant="outline">View All Quotations for Project</Button>
        </Link>
        <Link href={`/admin/purchase-orders?projectId=${projectId}`}>
          <Button size="sm" variant="outline">View All POs for Project</Button>
        </Link>
        <Link href={`/admin/invoices?projectId=${projectId}`}>
          <Button size="sm" variant="outline">View All Invoices for Project</Button>
        </Link>
        <Link href="/admin/expenses">
          <Button size="sm" variant="outline">All expenses</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-4">
        <Card className="border-primary/20 bg-primary/[0.04] dark:bg-primary/[0.07]">
          <CardContent className="py-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              Revenue (Base)
            </p>
            <p className="text-2xl font-bold text-foreground">
              ₹{formatAed(data.financials?.totalReceivedBase ?? 0)}
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-red-500/20 bg-red-500/[0.04] dark:bg-red-500/[0.07]">
          <CardContent className="py-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-red-600/70 mb-1">
              Expenses & Fees (Base)
            </p>
            <p className="text-2xl font-bold text-red-600">
              ₹{formatAed((data.financials?.totalExpensesBase ?? 0) + (data.financials?.totalFeesBase ?? 0))}
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-green-500/30 bg-green-500/[0.05] dark:bg-green-500/[0.08] sm:col-span-2">
          <CardContent className="py-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-green-700/70 dark:text-green-400/70 mb-1">
              Net Profit (Base)
            </p>
            <p className="text-3xl font-bold text-green-700 dark:text-green-400">
              ₹{formatAed(data.financials?.profitBase ?? 0)}
            </p>
          </CardContent>
        </Card>
      </div>
      <SectionTable
        title="Quotations"
        columns={[
          { key: "quotationNumber", label: "Quotation #" },
          { key: "status", label: "Status" },
          { key: "createdAt", label: "Created At" },
        ]}
        rows={(data.quotations ?? []).map((q) => ({
          ...q,
          createdAt: new Date(String(q.createdAt)).toLocaleString(),
        }))}
      />
      <SectionTable
        title="Purchase Orders"
        columns={[
          { key: "poNumber", label: "PO #" },
          { key: "type", label: "Type" },
          { key: "status", label: "Status" },
          { key: "createdAt", label: "Created At" },
        ]}
        rows={(data.purchaseOrders ?? []).map((po) => ({
          ...po,
          createdAt: new Date(String(po.createdAt)).toLocaleString(),
        }))}
      />
      <AdminInvoicesCreateHelper projectId={projectId} embedded />
      <SectionTable
        title="Invoices"
        columns={[
          { key: "invoiceNumber", label: "Invoice #" },
          { key: "status", label: "Status" },
          { key: "dueDate", label: "Due Date" },
          { key: "createdAt", label: "Created At" },
        ]}
        rows={(data.invoices ?? []).map((inv) => ({
          ...inv,
          dueDate: inv.dueDate ? new Date(String(inv.dueDate)).toLocaleDateString() : "-",
          createdAt: new Date(String(inv.createdAt)).toLocaleString(),
        }))}
      />
      <SectionTable
        title="Expenses"
        columns={[
          { key: "title", label: "Title" },
          { key: "amount", label: "Amount (AED)" },
          { key: "category", label: "Category" },
          { key: "createdAt", label: "Created At" },
        ]}
        rows={(data.expenses ?? []).map((ex) => ({
          ...ex,
          amount: formatAed(ex.amount),
          createdAt: new Date(String(ex.createdAt)).toLocaleString(),
        }))}
      />
    </div>
  );
}
