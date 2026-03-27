"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type ProjectDetailsPayload = {
  project?: {
    _id: string;
    name: string;
    description?: string;
    status: "lead" | "in_progress" | "completed" | "on_hold";
    priority: "low" | "medium" | "high";
    budget?: unknown;
    clientId: string;
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
          <table className="w-full min-w-[680px] text-left text-sm">
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
  });

  async function load() {
    const response = await fetch(`/api/admin/projects/${projectId}/details`, {
      cache: "no-store",
    });
    const payload = (await response.json()) as ProjectDetailsPayload;
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
      });
    }
  }

  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : "Failed to load details"));
  }, [projectId]);

  async function saveProject() {
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
        }),
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(payload.message ?? "Failed to update project");
      setEditing(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update project");
    } finally {
      setSaving(false);
    }
  }

  async function deleteProject() {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/projects/${projectId}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(payload.message ?? "Failed to delete project");
      router.push("/admin/projects");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete project");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="animate-[fade-in_0.4s_ease-out_both]">
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
                  <Button size="sm" onClick={saveProject} disabled={saving}>
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
                  <Button size="sm" variant="destructive" onClick={deleteProject} disabled={saving}>
                    Delete
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {editing ? (
            <>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              <Select
                value={form.status}
                onChange={(e) =>
                  setForm((f) => ({ ...f, status: e.target.value as typeof f.status }))
                }
                options={[
                  { value: "lead", label: "lead" },
                  { value: "in_progress", label: "in_progress" },
                  { value: "completed", label: "completed" },
                  { value: "on_hold", label: "on_hold" },
                ]}
              />
              <Select
                value={form.priority}
                onChange={(e) =>
                  setForm((f) => ({ ...f, priority: e.target.value as typeof f.priority }))
                }
                options={[
                  { value: "low", label: "low" },
                  { value: "medium", label: "medium" },
                  { value: "high", label: "high" },
                ]}
              />
              <Input
                type="number"
                value={form.budget}
                onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))}
              />
            </>
          ) : (
            <>
              <p><strong>Name:</strong> {data.project?.name ?? "-"}</p>
              <p><strong>Status:</strong> {data.project?.status ?? "-"}</p>
              <p><strong>Priority:</strong> {data.project?.priority ?? "-"}</p>
              <p><strong>Budget:</strong> {normalizeBudget(data.project?.budget) || "-"}</p>
              <p><strong>Description:</strong> {data.project?.description ?? "-"}</p>
              <p>
                <strong>Client:</strong>{" "}
                {data.client ? `${data.client.name} (${data.client.company})` : "-"}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <div className="mb-2 flex flex-wrap justify-end gap-2">
        <Link href={`/admin/quotations?projectId=${projectId}`}>
          <Button size="sm" variant="outline">View All Quotations for Project</Button>
        </Link>
        <Link href={`/admin/purchase-orders?projectId=${projectId}`}>
          <Button size="sm" variant="outline">View All POs for Project</Button>
        </Link>
        <Link href={`/admin/invoices?projectId=${projectId}`}>
          <Button size="sm" variant="outline">View All Invoices for Project</Button>
        </Link>
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
    </div>
  );
}
