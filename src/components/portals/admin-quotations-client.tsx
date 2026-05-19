"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Eye, FileText, Loader2, Plus, Trash2 } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { QuotationBuilderPanel } from "@/components/quotation/QuotationBuilderPanel";
import { quotationItemToGeneratorData } from "@/lib/quotation/map-stored-to-generator";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { QuotationStatusEditor } from "@/components/portals/admin-quotation-details/quotation-status-card";
import { cn } from "@/lib/utils/cn";
import type { QuotationData } from "@/types/quotation-generator";
import { apiFetch } from "@/lib/api/client";
import type { QuotationPayload } from "@/components/portals/admin-quotation-details/types";
import { usePortalConfig } from "@/components/portals/portal-config-context";

function normalizeQuotationStatus(s: string | undefined): QuotationPayload["status"] {
  if (s === "draft" || s === "sent" || s === "approved" || s === "rejected") return s;
  return "draft";
}

type QuotationRow = {
  _id: string;
  quotationNumber?: string;
  status?: string;
  projectName?: string;
  createdAt?: string;
  purchaseOrderCount?: number;
  purchaseOrderNumbers?: string[];
  totalAmount?: number | null;
};

function formatMoney(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function AdminQuotationsClient({
  initialProjectId = "",
}: {
  initialProjectId?: string;
}) {
  const { apiPrefix, pathPrefix } = usePortalConfig();
  const [rows, setRows] = useState<QuotationRow[]>([]);
  const [total, setTotal] = useState(0);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [builderOpen, setBuilderOpen] = useState(false);
  const [builderKey, setBuilderKey] = useState(0);
  const [editingQuotationId, setEditingQuotationId] = useState<string | null>(null);
  const [initialSnapshot, setInitialSnapshot] = useState<QuotationData | null>(null);
  const [builderLinkedProjectId, setBuilderLinkedProjectId] = useState("");
  const [builderLinkedProjectName, setBuilderLinkedProjectName] = useState("");
  const [rowBusyId, setRowBusyId] = useState("");
  const [isCurrencyLocked, setIsCurrencyLocked] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchList = useCallback(async () => {
    setListLoading(true);
    setListError("");
    try {
      const q = initialProjectId
        ? `?limit=200&projectId=${encodeURIComponent(initialProjectId)}`
        : "?limit=200";
      const payload = await apiFetch<{ items?: QuotationRow[]; total?: number }>(
        `${apiPrefix}/quotations${q}`
      );
      const items = payload.items ?? [];
      setRows(
        items.map((r) => ({
          ...r,
          _id: String(r._id ?? ""),
        }))
      );
      setTotal(payload.total ?? items.length);
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Failed to load quotations");
      setRows([]);
      setTotal(0);
    } finally {
      setListLoading(false);
    }
  }, [apiPrefix, initialProjectId]);

  useEffect(() => {
    fetchList().catch(() => {});
  }, [fetchList]);

  const openNew = useCallback(() => {
    setEditingQuotationId(null);
    setInitialSnapshot(null);
    setBuilderLinkedProjectId("");
    setBuilderLinkedProjectName("");
    setBuilderKey((k) => k + 1);
    setBuilderOpen(true);
    window.requestAnimationFrame(() => {
      document.getElementById("quotation-builder")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, []);

  const loadQuotation = useCallback(async (id: string) => {
    setRowBusyId(id);
    try {
      const json = await apiFetch<{ item?: Record<string, unknown> }>(`${apiPrefix}/quotations/${id}`);
      if (!json?.item) throw new Error("Missing quotation");
      const item = json.item as {
        projectId?: string;
        projectName?: string;
        projectFixCurrency?: boolean;
        projectCurrency?: string;
      } & Parameters<typeof quotationItemToGeneratorData>[0];
      const data = quotationItemToGeneratorData(item);
      setBuilderLinkedProjectId(String(item.projectId ?? "").trim());
      setBuilderLinkedProjectName(String(item.projectName ?? "").trim());
      setIsCurrencyLocked(Boolean(item.projectFixCurrency));
      setEditingQuotationId(id);
      setInitialSnapshot(data);
      setBuilderKey((k) => k + 1);
      setBuilderOpen(true);
      window.requestAnimationFrame(() => {
        document.getElementById("quotation-builder")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Failed to load quotation");
    } finally {
      setRowBusyId("");
    }
  }, [apiPrefix]);

  const performDelete = useCallback(async () => {
    if (!deleteTargetId) return;
    setDeleteLoading(true);
    setListError("");
    try {
      await apiFetch(`${apiPrefix}/quotations/${deleteTargetId}`, {
        method: "DELETE",
      });
      setDeleteTargetId(null);
      await fetchList();
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleteLoading(false);
    }
  }, [apiPrefix, deleteTargetId, fetchList]);

  const closeBuilder = useCallback(() => {
    setBuilderOpen(false);
    setEditingQuotationId(null);
    setInitialSnapshot(null);
    setBuilderLinkedProjectId("");
    setBuilderLinkedProjectName("");
  }, []);

  const onDbSaveSuccess = useCallback(
    (info: { quotationId: string; quotationNumber: string; created: boolean }) => {
      if (info.created && info.quotationId) {
        setEditingQuotationId(info.quotationId);
      }
      fetchList().catch(() => {});
    },
    [fetchList]
  );

  const deleteTargetRow = deleteTargetId
    ? rows.find((r) => r._id === deleteTargetId)
    : null;

  return (
    <div className="animate-fade-in">
      <ConfirmDialog
        open={deleteTargetId !== null}
        onOpenChange={(o) => {
          if (!o && !deleteLoading) setDeleteTargetId(null);
        }}
        title="Delete this quotation?"
        description={
          deleteTargetRow?.quotationNumber
            ? `Permanently remove quotation ${deleteTargetRow.quotationNumber}? This cannot be undone. Delete is blocked if purchase orders are linked.`
            : "Permanently remove this quotation? Delete is blocked if purchase orders are linked."
        }
        confirmLabel="Delete"
        variant="destructive"
        loading={deleteLoading}
        onConfirm={() => void performDelete()}
      />

      {initialProjectId ? (
        <Link
          href={`${pathPrefix}/projects/${initialProjectId}`}
          className="group mb-6 inline-flex items-center gap-2 rounded-lg text-[0.8125rem] font-medium text-muted-foreground transition-[color,background-color] duration-200 hover:bg-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <ArrowLeft
            className="size-4 transition-transform duration-200 group-hover:-translate-x-0.5"
            aria-hidden
          />
          Back to project
        </Link>
      ) : null}

      <DashboardPageHeader
        title="Quotations"
        description={
          initialProjectId
            ? "Saved quotations for this project. Open the builder to create or edit."
            : "Manage quotations — same list pattern as purchase orders and invoices."
        }
      />

      <Card className="mb-8 overflow-hidden border-border/80">
        <div className="h-1 bg-linear-to-r from-primary/70 via-primary to-primary/35" />
        <CardHeader className="border-b border-border/60 bg-muted/20 pb-5 dark:bg-muted/10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary ring-1 ring-primary/20">
                <FileText className="size-5" aria-hidden />
              </span>
              <div>
                <CardTitle className="text-[1.15rem] sm:text-xl">Saved quotations</CardTitle>
                <CardDescription className="mt-1.5 max-w-lg">
                  Totals and purchase order counts update from live data. Use{" "}
                  <strong className="text-foreground">View</strong> for the full page with status
                  controls and PO uploads.
                </CardDescription>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 rounded-full border border-border/80 bg-background/80 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
                <span className="tabular-nums text-foreground">{total}</span>
                <span>total</span>
              </div>
              <Button type="button" className="gap-2 rounded-xl" onClick={openNew}>
                <Plus className="size-4" aria-hidden />
                New quotation
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {listError ? (
            <div
              className="m-5 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive"
              role="alert"
            >
              {listError}
            </div>
          ) : null}
          {listLoading && rows.length === 0 ? (
            <div className="overflow-x-auto" aria-busy="true">
              <table className="w-full min-w-[72rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-border/80 bg-muted/30 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground dark:bg-muted/15">
                    <th className="px-5 py-3.5 pr-3">Quotation #</th>
                    <th className="px-0 py-3.5 pr-3">Project</th>
                    <th className="px-0 py-3.5 pr-3">Total</th>
                    <th className="px-0 py-3.5 pr-3">PO links</th>
                    <th className="px-0 py-3.5 pr-3">Status</th>
                    <th className="px-0 py-3.5 pr-3">Created</th>
                    <th className="px-0 py-3.5 pr-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {Array.from({ length: 8 }).map((_, ri) => (
                    <tr key={ri} className="bg-card">
                      <td className="px-5 py-3.5 pr-3">
                        <Skeleton className="h-4 w-28" />
                      </td>
                      <td className="px-0 py-3.5 pr-3">
                        <Skeleton className="h-4 w-full max-w-[12rem]" />
                      </td>
                      <td className="px-0 py-3.5 pr-3">
                        <Skeleton className="h-4 w-24" />
                      </td>
                      <td className="px-0 py-3.5 pr-3">
                        <Skeleton className="h-6 w-20 rounded-full" />
                      </td>
                      <td className="px-0 py-3.5 pr-3">
                        <Skeleton className="h-8 w-24 rounded-md" />
                      </td>
                      <td className="px-0 py-3.5 pr-3">
                        <Skeleton className="h-4 w-36" />
                      </td>
                      <td className="px-0 py-3.5 pr-5 text-right">
                        <div className="ml-auto flex justify-end gap-2">
                          <Skeleton className="h-8 w-[4.5rem] rounded-lg" />
                          <Skeleton className="h-8 w-14 rounded-lg" />
                          <Skeleton className="h-8 w-14 rounded-lg" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : !listLoading && rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
              <p className="text-base font-semibold text-foreground">No quotations yet</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Create one with <strong className="text-foreground">New quotation</strong> below.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[72rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-border/80 bg-muted/30 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground dark:bg-muted/15">
                    <th className="px-5 py-3.5 pr-3">Quotation #</th>
                    <th className="px-0 py-3.5 pr-3">Project</th>
                    <th className="px-0 py-3.5 pr-3">Total</th>
                    <th className="px-0 py-3.5 pr-3">PO links</th>
                    <th className="px-0 py-3.5 pr-3">Status</th>
                    <th className="px-0 py-3.5 pr-3">Created</th>
                    <th className="px-0 py-3.5 pr-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {rows.map((row) => {
                    const busy = rowBusyId === row._id;
                    const poCount = row.purchaseOrderCount ?? 0;
                    const poNums = row.purchaseOrderNumbers ?? [];
                    const poPreview =
                      poNums.length > 0
                        ? poNums.slice(0, 3).join(", ") + (poNums.length > 3 ? "…" : "")
                        : null;
                    return (
                      <tr
                        key={row._id}
                        className="bg-card transition-colors hover:bg-muted/35 dark:hover:bg-muted/20"
                      >
                        <td className="px-5 py-3.5 pr-3 font-medium text-foreground">
                          {row.quotationNumber ?? "—"}
                        </td>
                        <td className="max-w-48 px-0 py-3.5 pr-3 text-muted-foreground">
                          <span className="line-clamp-2">{row.projectName || "—"}</span>
                        </td>
                        <td className="whitespace-nowrap px-0 py-3.5 pr-3 tabular-nums text-foreground">
                          {row.totalAmount != null ? `AED ${formatMoney(row.totalAmount ?? null)}` : "—"}
                        </td>
                        <td className="max-w-48 px-0 py-3.5 pr-3 align-middle">
                          <div className="flex flex-col gap-1">
                            <span
                              className={cn(
                                "inline-flex w-fit rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums",
                                poCount > 0
                                  ? "bg-primary/15 text-primary"
                                  : "bg-muted text-muted-foreground"
                              )}
                            >
                              {poCount} PO{poCount === 1 ? "" : "s"}
                            </span>
                            {poPreview ? (
                              <span className="text-[11px] leading-snug text-muted-foreground line-clamp-1">
                                {poPreview}
                              </span>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">—</span>
                            )}
                          </div>
                        </td>
                        <td className="px-0 py-3.5 pr-3 align-middle">
                          <QuotationStatusEditor
                            quotationId={row._id}
                            currentStatus={normalizeQuotationStatus(row.status)}
                            onUpdated={() => fetchList().catch(() => {})}
                            variant="inline"
                          />
                        </td>
                        <td className="whitespace-nowrap px-0 py-3.5 pr-3 text-muted-foreground tabular-nums">
                          {row.createdAt
                            ? new Date(row.createdAt).toLocaleString()
                            : "—"}
                        </td>
                        <td className="whitespace-nowrap px-0 py-3.5 pr-5 text-right align-middle">
                          <div className="flex flex-nowrap items-center justify-end gap-2">
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              className="rounded-lg"
                              asChild
                            >
                              <Link href={`${pathPrefix}/quotations/${row._id}`}>
                                <Eye className="size-4" aria-hidden />
                                View
                              </Link>
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="rounded-lg"
                              disabled={busy}
                              onClick={() => loadQuotation(row._id)}
                            >
                              {busy ? (
                                <Loader2 className="size-4 animate-spin" aria-hidden />
                              ) : (
                                "Load"
                              )}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 shrink-0 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"
                              disabled={busy}
                              onClick={() => setDeleteTargetId(row._id)}
                              title="Delete"
                            >
                              <Trash2 className="size-4" aria-hidden />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {builderOpen ? (
        <section
          id="quotation-builder"
          className="scroll-mt-6 rounded-2xl border border-border/70 bg-card/95 p-5 shadow-(--shadow-premium) backdrop-blur-[2px] sm:p-6"
        >
          <QuotationBuilderPanel
            key={builderKey}
            variant="embedded"
            initialSaveProjectId={initialProjectId}
            linkedQuotationProjectId={builderLinkedProjectId}
            linkedQuotationProjectName={builderLinkedProjectName}
            editingQuotationId={editingQuotationId}
            initialSnapshot={initialSnapshot}
            onDbSaveSuccess={onDbSaveSuccess}
            onCancelEdit={closeBuilder}
            isCurrencyLocked={isCurrencyLocked}
          />
        </section>
      ) : null}
    </div>
  );
}
