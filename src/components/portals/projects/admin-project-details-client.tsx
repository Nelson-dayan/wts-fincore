"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { readResponseJson } from "@/lib/http/read-response-json";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SaveSuccessToast } from "@/components/ui/save-success-toast";
import { AdminInvoicesCreateHelper } from "@/components/portals/admin-invoices-create-helper";
import { SUPPORTED_CURRENCIES, DEFAULT_CURRENCY } from "@/lib/constants/finance";
import { usePortalConfig } from "@/components/portals/portal-config-context";
import { useSaveFeedback } from "@/lib/hooks/use-save-feedback";
import { formatCurrency } from "@/lib/utils/formatters";
import { ProjectTeamPermissions } from "./project-team-permissions";
import { ProjectContactsCard } from "./project-contacts-card";
import { ProjectAuditHistoryCard } from "./project-audit-history-card";

type ProjectDetailsPayload = {
  project?: {
    _id: string;
    name: string;
    description?: string;
    status: "active" | "completed" | "on_hold";
    priority: "low" | "medium" | "high";
    budget?: unknown;
    clientId: string;
    assignedMembers?: any[];
    currency?: string;
    category?: string;
    clientReference?: string;
    notes?: string;
    startDate?: string;
    targetEndDate?: string;
    actualEndDate?: string;
    fixCurrency?: boolean;
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
  payments?: Array<{
    _id: string;
    amount: number;
    currency: string;
    method: string;
    referenceNumber?: string;
    receivedAt: string;
    accountId?: { name: string; currency: string };
    createdAt: string;
  }>;
  expenses?: Array<{
    _id: string;
    title: string;
    amount: number;
    currency?: string;
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

import { RecordPaymentModal } from "@/components/portals/record-payment-modal";

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

export function AdminProjectDetailsClient({
  projectId,
  allowProjectMutations = true,
}: {
  projectId: string;
  /** When false, project profile is view-only (e.g. employee portal). */
  allowProjectMutations?: boolean;
}) {
  const router = useRouter();
  const { apiPrefix, pathPrefix } = usePortalConfig();
  const { successMessage, clearSaveFeedback, showSaveSuccess } = useSaveFeedback();
  const [data, setData] = useState<ProjectDetailsPayload>({});
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    status: "active" as "active" | "completed" | "on_hold",
    priority: "medium" as "low" | "medium" | "high",
    budget: "",
    currency: "AED",
    category: "Fixed Price",
    clientReference: "",
    notes: "",
    startDate: "",
    targetEndDate: "",
    actualEndDate: "",
    fixCurrency: false,
  });
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [allUsers, setAllUsers] = useState<Array<{ _id: string; name: string; email: string; role: string }>>([]);

  const load = useCallback(async () => {
    const response = await fetch(`${apiPrefix}/projects/${encodeURIComponent(projectId)}`, {
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
        status: payload.project.status ?? "active",
        priority: payload.project.priority ?? "medium",
        budget: normalizedBudget,
        currency: payload.project.currency ?? "AED",
        category: payload.project.category ?? "Fixed Price",
        clientReference: payload.project.clientReference ?? "",
        notes: payload.project.notes ?? "",
        startDate: payload.project.startDate ? new Date(payload.project.startDate).toISOString().split('T')[0] : "",
        targetEndDate: payload.project.targetEndDate ? new Date(payload.project.targetEndDate).toISOString().split('T')[0] : "",
        actualEndDate: payload.project.actualEndDate ? new Date(payload.project.actualEndDate).toISOString().split('T')[0] : "",
        fixCurrency: !!payload.project.fixCurrency,
      });
    }
  }, [projectId, apiPrefix]);

  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : "Failed to load details"));

    if (allowProjectMutations) {
      fetch(`${apiPrefix}/users?limit=100`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data.items)) {
            setAllUsers(data.items);
          } else if (Array.isArray(data.users)) {
            setAllUsers(data.users);
          }
        })
        .catch(() => {});
    }
  }, [load, allowProjectMutations, apiPrefix]);

  async function saveProject(): Promise<boolean> {
    setSaving(true);
    setError("");
    clearSaveFeedback();
    try {
      const response = await fetch(`${apiPrefix}/projects/${projectId}`, {
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
          fixCurrency: form.fixCurrency,
        }),
      });
      const payload = await readResponseJson<{ message?: string }>(response);
      if (!response.ok) throw new Error(payload.message ?? "Failed to update project");
      setEditing(false);
      await load();
      showSaveSuccess();
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
      const response = await fetch(`${apiPrefix}/projects/${projectId}`, {
        method: "DELETE",
      });
      const payload = await readResponseJson<{ message?: string }>(response);
      if (!response.ok) throw new Error(payload.message ?? "Failed to delete project");
      const parentClientId = data.project?.clientId?.trim();
      router.replace(
        parentClientId
          ? `${pathPrefix}/clients/${encodeURIComponent(parentClientId)}`
          : `${pathPrefix}/projects`
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
      <SaveSuccessToast message={successMessage} />
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
      <Card className="overflow-hidden border-border/50 bg-background/80 shadow-xl backdrop-blur">
        {/* Header */}
        <div className="relative border-b border-border/50 bg-gradient-to-r from-primary/10 via-background to-background px-6 py-5">

          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

            {/* Left */}
            <div className="flex items-center gap-4">

              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-2xl font-bold text-primary shadow-inner">
                {editing ? (form.name?.charAt(0) || "P") : (data.project?.name?.charAt(0) || "P")}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {editing ? (
                    <input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="bg-transparent border-b border-dashed border-primary/40 focus:border-solid focus:border-primary text-2xl font-semibold tracking-tight focus:outline-none w-72 max-w-full px-0 py-0"
                      placeholder="Project Name"
                    />
                  ) : (
                    <h2 className="text-2xl font-semibold tracking-tight">
                      {data.project?.name || "Untitled Project"}
                    </h2>
                  )}

                  {editing ? (
                    <Select
                      value={form.status}
                      onValueChange={(val) => setForm({ ...form, status: val as any })}
                      options={[
                        { value: "active", label: "Active" },
                        { value: "completed", label: "Completed" },
                        { value: "on_hold", label: "On Hold" },
                      ]}
                    />
                  ) : (
                    <Badge
                      variant="outline"
                      className="rounded-full border-primary/20 bg-primary/5 text-primary"
                    >
                      {data.project?.status?.replace("_", " ")}
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span>
                    {data.client
                      ? `${data.client.name} • ${data.client.company}`
                      : "No client assigned"}
                  </span>

                  <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />

                  <span>{editing ? form.category || "Uncategorized" : (data.project?.category || "Uncategorized")}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            {allowProjectMutations && (
              <div className="flex items-center gap-2">
                {editing ? (
                  <>
                    <Button
                      size="sm"
                      className="rounded-xl shadow-sm"
                      onClick={() => void saveProject()}
                      disabled={saving}
                    >
                      Save Changes
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl"
                      onClick={() => {
                        setEditing(false);
                        if (data.project) {
                          const normalizedBudget = normalizeBudget(data.project.budget);
                          setForm({
                            name: data.project.name ?? "",
                            description: data.project.description ?? "",
                            status: data.project.status ?? "active",
                            priority: data.project.priority ?? "medium",
                            budget: normalizedBudget,
                            currency: data.project.currency ?? "AED",
                            category: data.project.category ?? "Fixed Price",
                            clientReference: data.project.clientReference ?? "",
                            notes: data.project.notes ?? "",
                            startDate: data.project.startDate ? new Date(data.project.startDate).toISOString().split('T')[0] : "",
                            targetEndDate: data.project.targetEndDate ? new Date(data.project.targetEndDate).toISOString().split('T')[0] : "",
                            actualEndDate: data.project.actualEndDate ? new Date(data.project.actualEndDate).toISOString().split('T')[0] : "",
                            fixCurrency: !!data.project.fixCurrency,
                          });
                        }
                      }}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl"
                      onClick={() => setEditing(true)}
                    >
                      Edit Project
                    </Button>

                    <Button
                      size="sm"
                      variant="destructive"
                      className="rounded-xl"
                      onClick={() => setDeleteConfirmOpen(true)}
                      disabled={saving}
                    >
                      Delete
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <CardContent className="space-y-8 p-6">

          {/* Quick Stats */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

            <div className="rounded-2xl border border-border/50 bg-muted/30 p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Budget
              </p>
              {editing ? (
                <div className="mt-2 space-y-1">
                  <div className="flex items-baseline gap-1 text-2xl font-semibold tracking-tight">
                    <Select
                      value={form.currency}
                      onValueChange={(val) => setForm({ ...form, currency: val })}
                      options={SUPPORTED_CURRENCIES.map((c) => ({
                        value: c.value,
                        label: c.value,
                      }))}
                    />
                    <input
                      type="number"
                      value={form.budget}
                      onChange={(e) => setForm({ ...form, budget: e.target.value })}
                      className="bg-transparent border-b border-dashed border-muted-foreground/30 focus:border-solid focus:border-primary font-semibold focus:outline-none p-0 w-full tracking-tight"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-2xl font-semibold tracking-tight">
                  {data.project?.currency || "INR"}{" "}
                  {normalizeBudget(data.project?.budget) || "-"}
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-border/50 bg-muted/30 p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Priority
              </p>
              {editing ? (
                <Select
                  value={form.priority}
                  onValueChange={(val) => setForm({ ...form, priority: val as any })}
                  options={[
                    { value: "low", label: "Low" },
                    { value: "medium", label: "Medium" },
                    { value: "high", label: "High" },
                  ]}
                />
              ) : (
                <p className="mt-2 text-2xl font-semibold capitalize tracking-tight">
                  {data.project?.priority || "-"}
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-border/50 bg-muted/30 p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Start Date
              </p>
              {editing ? (
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className="mt-2 bg-transparent border-b border-dashed border-muted-foreground/30 focus:border-solid focus:border-primary text-lg font-medium focus:outline-none w-full p-0"
                />
              ) : (
                <p className="mt-2 text-lg font-medium">
                  {data.project?.startDate
                    ? new Date(data.project.startDate).toLocaleDateString()
                    : "-"}
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-border/50 bg-muted/30 p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Target End
              </p>
              {editing ? (
                <div className="mt-2 space-y-2">
                  <input
                    type="date"
                    value={form.targetEndDate}
                    onChange={(e) => setForm({ ...form, targetEndDate: e.target.value })}
                    className="bg-transparent border-b border-dashed border-muted-foreground/30 focus:border-solid focus:border-primary text-lg font-medium focus:outline-none w-full p-0"
                  />
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Actual:</span>
                    <input
                      type="date"
                      value={form.actualEndDate}
                      onChange={(e) => setForm({ ...form, actualEndDate: e.target.value })}
                      className="bg-transparent border-b border-dashed border-muted-foreground/30 focus:border-solid focus:border-primary text-xs focus:outline-none w-full p-0"
                    />
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-lg font-medium">
                  {data.project?.targetEndDate
                    ? new Date(data.project.targetEndDate).toLocaleDateString()
                    : "-"}
                  {data.project?.actualEndDate && (
                    <span className="block text-xs text-muted-foreground mt-1">
                      Actual: {new Date(data.project.actualEndDate).toLocaleDateString()}
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>

          {/* Main Grid */}
          <div className="grid gap-6 lg:grid-cols-3">

            {/* Left */}
            <div className="space-y-6 lg:col-span-2">

              {/* Overview */}
              <div className="rounded-2xl border border-border/50 bg-background p-6 shadow-sm">

                <div className="mb-5 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary" />

                  <h3 className="text-lg font-semibold">
                    Project Overview
                  </h3>
                </div>

                <div className="space-y-5">

                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Description
                    </p>
                    {editing ? (
                      <textarea
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        className="w-full bg-transparent border-b border-dashed border-muted-foreground/30 focus:border-solid focus:border-primary text-muted-foreground leading-7 focus:outline-none p-0 resize-y min-h-[80px]"
                        placeholder="Project description..."
                      />
                    ) : (
                      <p className="leading-7 text-muted-foreground">
                        {data.project?.description || "No description provided."}
                      </p>
                    )}
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Internal Notes
                    </p>
                    {editing ? (
                      <textarea
                        value={form.notes}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                        className="w-full bg-muted/40 rounded-xl p-4 text-sm leading-6 text-muted-foreground border-b-2 border-dashed border-primary/30 focus:border-solid focus:border-primary focus:outline-none resize-y min-h-[80px]"
                        placeholder="Internal notes..."
                      />
                    ) : (
                      <div className="rounded-xl bg-muted/40 p-4 text-sm leading-6 text-muted-foreground">
                        {data.project?.notes || "No internal notes available."}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <ProjectContactsCard
                projectId={projectId}
                projectName={data.project?.name}
                clientId={data.project?.clientId}
              />

              {allowProjectMutations && (
                <ProjectTeamPermissions
                  projectId={projectId}
                  initialMembers={data.project?.assignedMembers || []}
                  allUsers={allUsers}
                  onUpdate={load}
                />
              )}
            </div>

            {/* Right Sidebar */}
            <div className="space-y-6">

              {/* Client */}
              <div className="rounded-2xl border border-border/50 bg-background p-5 shadow-sm">

                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Client
                </h3>

                <div className="flex items-center gap-3">

                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                    {data.client?.name?.charAt(0) || "C"}
                  </div>

                  <div>
                    <p className="font-medium">
                      {data.client?.name || "-"}
                    </p>

                    <p className="text-sm text-muted-foreground">
                      {data.client?.company || "-"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Reference */}
              <div className="rounded-2xl border border-border/50 bg-background p-5 shadow-sm space-y-4">
                <div>
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Client Reference
                  </h3>
                  {editing ? (
                    <input
                      value={form.clientReference}
                      onChange={(e) => setForm({ ...form, clientReference: e.target.value })}
                      className="bg-transparent border-b border-dashed border-muted-foreground/30 focus:border-solid focus:border-primary font-mono text-sm focus:outline-none w-full p-0"
                      placeholder="e.g. REF-102"
                    />
                  ) : (
                    <p className="font-mono text-sm">
                      {data.project?.clientReference || "N/A"}
                    </p>
                  )}
                </div>

                <div>
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Category
                  </h3>
                  {editing ? (
                    <Select
                      id="project-category"
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="mt-1 bg-background text-foreground border-border/70 dark:bg-slate-900"
                      options={[
                        { value: "Fixed Price", label: "Fixed Price" },
                        { value: "Retainer", label: "Retainer" },
                        { value: "Time & Materials", label: "Time & Materials" },
                        { value: "Other", label: "Other" },
                      ]}
                    />
                  ) : (
                    <p className="text-sm">
                      {data.project?.category || "Uncategorized"}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mb-2 flex flex-wrap justify-end gap-2">
        <Button size="sm" className="" onClick={() => setPaymentModalOpen(true)}>
          Record Payment
        </Button>
        <Link href={`${pathPrefix}/expenses?projectId=${projectId}`}>
          <Button size="sm">Add Expense</Button>
        </Link>
        <Link href={`${pathPrefix}/quotations?projectId=${projectId}#quotation-builder`}>
          <Button size="sm">Create quotation</Button>
        </Link>
        <Link href={`${pathPrefix}/quotations?projectId=${projectId}`}>
          <Button size="sm" variant="outline">Quotations</Button>
        </Link>
        <Link href={`${pathPrefix}/purchase-orders?projectId=${projectId}`}>
          <Button size="sm" variant="outline">POs</Button>
        </Link>
        <Link href={`${pathPrefix}/invoices?projectId=${projectId}`}>
          <Button size="sm" variant="outline">Invoices</Button>
        </Link>
        <Link href={`${pathPrefix}/expenses?projectId=${projectId}`}>
          <Button size="sm" variant="outline">Expenses</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-4">
        <Card className="border-primary/20 bg-primary/[0.04] dark:bg-primary/[0.07]">
          <CardContent className="py-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              Revenue (Base)
            </p>
            <p className="text-2xl font-bold text-foreground">
              {formatCurrency(data.financials?.totalReceivedBase ?? 0, (data.project as any)?.currency || "AED")}
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-red-500/20 bg-red-500/[0.04] dark:bg-red-500/[0.07]">
          <CardContent className="py-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-red-600/70 mb-1">
              Expenses & Fees (Base)
            </p>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency((data.financials?.totalExpensesBase ?? 0) + (data.financials?.totalFeesBase ?? 0), (data.project as any)?.currency || "AED")}
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-green-500/30 bg-green-500/[0.05] dark:bg-green-500/[0.08] sm:col-span-2">
          <CardContent className="py-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-green-700/70 dark:text-green-400/70 mb-1">
              Net Profit (Base)
            </p>
            <p className="text-3xl font-bold text-green-700 dark:text-green-400">
              {formatCurrency(data.financials?.profitBase ?? 0, (data.project as any)?.currency || "AED")}
            </p>
          </CardContent>
        </Card>
      </div>

      <SectionTable
        title="Payments Ledger"
        columns={[
          { key: "receivedAt", label: "Date" },
          { key: "amountDisplay", label: "Amount" },
          { key: "accountDisplay", label: "Account" },
          { key: "method", label: "Method" },
          { key: "referenceNumber", label: "Reference" },
        ]}
        rows={(data.payments ?? []).map((p) => ({
          ...p,
          receivedAt: new Date(String(p.receivedAt)).toLocaleDateString(),
          amountDisplay: formatCurrency(p.amount, p.currency || (data.project as any)?.currency || "AED"),
          accountDisplay: (p.accountId as any)?.name || "-",
        }))}
      />

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
    {/* <AdminInvoicesCreateHelper projectId={projectId} embedded /> */}
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
          { key: "amount", label: "Amount" },
          { key: "category", label: "Category" },
          { key: "createdAt", label: "Created At" },
        ]}
        rows={(data.expenses ?? []).map((ex) => ({
          ...ex,
          amount: formatCurrency(ex.amount, ex.currency || (data.project as any)?.currency || "AED"),
          createdAt: new Date(String(ex.createdAt)).toLocaleString(),
        }))}
      />

      <ProjectAuditHistoryCard projectId={projectId} />

      <RecordPaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        onSuccess={load}
        apiPrefix={apiPrefix}
        initialProjectId={projectId}
      />
    </div>
  );
}
