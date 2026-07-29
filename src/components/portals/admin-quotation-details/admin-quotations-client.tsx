"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileEdit,
  FileText,
  Filter,
  LayoutGrid,
  List,
  Loader2,
  Plus,
  Search,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { QuotationBuilderPanel } from "@/components/quotation/QuotationBuilderPanel";
import { quotationItemToGeneratorData } from "@/lib/quotation/map-stored-to-generator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
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
  
  // View mode, search, filter, and pagination
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(9);

  // Builder and dialog states
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
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (initialProjectId) params.set("projectId", initialProjectId);
      if (searchQuery.trim()) params.set("q", searchQuery.trim());

      const payload = await apiFetch<{ items?: QuotationRow[]; total?: number }>(
        `${apiPrefix}/quotations?${params.toString()}`
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
  }, [apiPrefix, initialProjectId, page, limit, searchQuery]);

  useEffect(() => {
    fetchList().catch(() => {});
  }, [fetchList]);

  // Reset to page 1 when search or limit changes
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setPage(1);
  };

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

  // Client-side status filter
  const displayedRows = rows.filter((r) => {
    if (statusFilter !== "all" && normalizeQuotationStatus(r.status) !== statusFilter) {
      return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="animate-fade-in space-y-6">
      <ConfirmDialog
        open={deleteTargetId !== null}
        onOpenChange={(o) => {
          if (!o && !deleteLoading) setDeleteTargetId(null);
        }}
        title="Delete this quotation?"
        description={
          deleteTargetRow?.quotationNumber
            ? `Permanently remove quotation ${deleteTargetRow.quotationNumber}? Delete is blocked if purchase orders are linked.`
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
          className="group inline-flex items-center gap-2 rounded-lg text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
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
            : "Manage & track quotations — search, filter, update workflow status, and generate POs."
        }
      />

      <Card className="overflow-hidden border-border/80 shadow-sm">
        <div className="h-1 bg-linear-to-r from-primary/80 via-indigo-500 to-sky-400" />
        
        {/* Card Header & Primary Action Toolbar */}
        <CardHeader className="border-b border-border/60 bg-muted/20 pb-5 dark:bg-muted/10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary ring-1 ring-primary/20 shadow-2xs">
                <FileText className="size-5" aria-hidden />
              </span>
              <div>
                <CardTitle className="text-lg font-bold sm:text-xl">Saved Quotations</CardTitle>
                <CardDescription className="mt-1 text-xs sm:text-sm">
                  Live quotation metrics, workflow status, and linked purchase orders.
                </CardDescription>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Total counter badge */}
              <div className="flex items-center gap-2 rounded-full border border-border/80 bg-background/90 px-3.5 py-1.5 text-xs font-medium text-muted-foreground shadow-2xs">
                <span className="tabular-nums font-bold text-foreground">{total}</span>
                <span>total</span>
              </div>

              {/* View Switcher */}
              <div className="flex items-center rounded-xl border border-border/80 bg-background/90 p-1 shadow-2xs">
                <Button
                  type="button"
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7.5 px-3 rounded-lg text-xs font-medium gap-1.5"
                  onClick={() => setViewMode("grid")}
                  title="Card Grid View"
                  aria-label="Card Grid View"
                >
                  <LayoutGrid className="size-3.5" aria-hidden />
                  Cards
                </Button>
                <Button
                  type="button"
                  variant={viewMode === "table" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7.5 px-3 rounded-lg text-xs font-medium gap-1.5"
                  onClick={() => setViewMode("table")}
                  title="Table View"
                  aria-label="Table View"
                >
                  <List className="size-3.5" aria-hidden />
                  Table
                </Button>
              </div>

              {/* New Quotation Button */}
              <Button type="button" className="gap-2 rounded-xl h-9.5 px-4 shadow-sm" onClick={openNew}>
                <Plus className="size-4" aria-hidden />
                New quotation
              </Button>
            </div>
          </div>

          {/* Search Bar & Filter Options */}
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-border/50">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" aria-hidden />
              <Input
                type="text"
                placeholder="Search by quotation # or project..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9 h-9 text-xs bg-background/90 rounded-xl border-border/80"
              />
            </div>

            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-xs font-semibold text-muted-foreground mr-1 flex items-center gap-1 shrink-0">
                <Filter className="size-3" aria-hidden /> Filter:
              </span>
              {[
                { id: "all", label: "All" },
                { id: "draft", label: "Draft" },
                { id: "sent", label: "Sent" },
                { id: "approved", label: "Approved" },
                { id: "rejected", label: "Rejected" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={cn(
                    "px-3 py-1 text-xs font-medium rounded-lg transition-all shrink-0",
                    statusFilter === tab.id
                      ? "bg-primary text-primary-foreground shadow-2xs font-semibold"
                      : "bg-background/80 text-muted-foreground hover:bg-accent hover:text-foreground border border-border/60"
                  )}
                >
                  {tab.label}
                </button>
              ))}
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

          {/* Loading State */}
          {listLoading && rows.length === 0 ? (
            viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 p-6 bg-muted/10">
                {Array.from({ length: limit }).map((_, ri) => (
                  <div key={ri} className="rounded-2xl border border-border/60 bg-card p-5 space-y-4 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-5 w-36" />
                      <Skeleton className="h-7 w-24 rounded-lg" />
                    </div>
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-16 w-full rounded-xl" />
                    <div className="flex items-center justify-between pt-2">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-8 w-32 rounded-lg" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto" aria-busy="true">
                <table className="w-full min-w-[65rem] text-left text-sm">
                  <thead>
                    <tr className="border-b border-border/80 bg-muted/30 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground dark:bg-muted/15">
                      <th className="px-5 py-3.5">Quotation #</th>
                      <th className="px-3 py-3.5">Project</th>
                      <th className="px-3 py-3.5">Total</th>
                      <th className="px-3 py-3.5">PO links</th>
                      <th className="px-3 py-3.5">Status</th>
                      <th className="px-3 py-3.5">Created</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {Array.from({ length: 6 }).map((_, ri) => (
                      <tr key={ri} className="bg-card">
                        <td className="px-5 py-3.5"><Skeleton className="h-4 w-28" /></td>
                        <td className="px-3 py-3.5"><Skeleton className="h-4 w-40" /></td>
                        <td className="px-3 py-3.5"><Skeleton className="h-4 w-24" /></td>
                        <td className="px-3 py-3.5"><Skeleton className="h-6 w-20 rounded-full" /></td>
                        <td className="px-3 py-3.5"><Skeleton className="h-8 w-24 rounded-md" /></td>
                        <td className="px-3 py-3.5"><Skeleton className="h-4 w-28" /></td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="ml-auto flex justify-end gap-1.5">
                            <Skeleton className="h-8 w-8 rounded-lg" />
                            <Skeleton className="h-8 w-8 rounded-lg" />
                            <Skeleton className="h-8 w-8 rounded-lg" />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : !listLoading && displayedRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
              <p className="text-base font-semibold text-foreground">No quotations found</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                {searchQuery || statusFilter !== "all"
                  ? "Try clearing your search query or status filter."
                  : "Create one using the New quotation button above."}
              </p>
            </div>
          ) : viewMode === "grid" ? (
            /* Refined Premium Card Grid View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 p-6 bg-muted/10 dark:bg-muted/5">
              {displayedRows.map((row) => {
                const busy = rowBusyId === row._id;
                const poCount = row.purchaseOrderCount ?? 0;
                const poNums = row.purchaseOrderNumbers ?? [];
                const poPreview =
                  poNums.length > 0
                    ? poNums.slice(0, 3).join(", ") + (poNums.length > 3 ? "…" : "")
                    : null;
                const status = normalizeQuotationStatus(row.status);

                return (
                  <div
                    key={row._id}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-card p-5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-primary/50 hover:shadow-md dark:bg-card/95"
                  >
                    {/* Top Status Gradient Strip */}
                    <div
                      className={cn(
                        "absolute inset-x-0 top-0 h-1.5 transition-colors",
                        status === "approved"
                          ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                          : status === "sent"
                          ? "bg-gradient-to-r from-sky-500 to-blue-400"
                          : status === "rejected"
                          ? "bg-gradient-to-r from-rose-500 to-pink-500"
                          : "bg-gradient-to-r from-amber-400 to-orange-400"
                      )}
                    />

                    <div className="space-y-4 pt-1">
                      {/* Card Header Section */}
                      <div className="border-b border-border/50 pb-3 space-y-2">
                        {/* Top Row: Category Pill & Status Dropdown */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                              <FileText className="size-3.5" aria-hidden />
                            </span>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                              Quotation
                            </span>
                          </div>

                          {/* Interactive Status Dropdown Pill */}
                          <QuotationStatusEditor
                            quotationId={row._id}
                            currentStatus={status}
                            onUpdated={() => fetchList().catch(() => {})}
                            variant="inline"
                          />
                        </div>

                        {/* Full Width Quotation Number */}
                        <h3
                          className="text-base font-extrabold tracking-tight text-foreground select-all truncate pt-0.5"
                          title={row.quotationNumber}
                        >
                          {row.quotationNumber || "—"}
                        </h3>
                      </div>

                      {/* Project Name Section */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1">
                          <Building2 className="size-3 text-primary" aria-hidden /> Project
                        </span>
                        <p className="text-sm font-semibold text-foreground line-clamp-1">
                          {row.projectName || "Unassigned Project"}
                        </p>
                      </div>

                      {/* Financial Metric Box */}
                      <div className="rounded-xl border border-border/70 bg-gradient-to-br from-muted/40 via-card to-muted/20 p-3.5 flex items-center justify-between dark:bg-muted/15">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                            <TrendingUp className="size-3 text-emerald-500" aria-hidden /> Total Amount
                          </span>
                          <p className="mt-0.5 text-lg font-black tracking-tight text-foreground tabular-nums">
                            {row.totalAmount != null ? `AED ${formatMoney(row.totalAmount)}` : "—"}
                          </p>
                        </div>
                        <span className="text-[11px] font-extrabold text-primary bg-primary/10 px-2.5 py-1 rounded-lg">
                          AED
                        </span>
                      </div>
                    </div>

                    {/* Footer Row: Metadata & Action Buttons */}
                    <div className="mt-4 pt-3.5 border-t border-border/50 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold tabular-nums",
                            poCount > 0
                              ? "bg-primary/15 text-primary"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {poCount} PO{poCount === 1 ? "" : "s"}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground tabular-nums">
                          <Calendar className="size-3" aria-hidden />
                          {row.createdAt
                            ? new Date(row.createdAt).toLocaleDateString(undefined, {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })
                            : "—"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2.5 text-xs font-semibold gap-1 hover:bg-primary/10 hover:text-primary rounded-lg"
                          title="View quotation details"
                          aria-label="View quotation details"
                          asChild
                        >
                          <Link href={`${pathPrefix}/quotations/${row._id}`}>
                            <Eye className="size-3.5" aria-hidden />
                            View
                          </Link>
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 px-2.5 text-xs font-semibold gap-1 border-border/80 rounded-lg"
                          disabled={busy}
                          onClick={() => loadQuotation(row._id)}
                          title="Load into builder"
                          aria-label="Load into builder"
                        >
                          {busy ? (
                            <Loader2 className="size-3.5 animate-spin" aria-hidden />
                          ) : (
                            <FileEdit className="size-3.5" aria-hidden />
                          )}
                          Edit
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 rounded-lg"
                          disabled={busy}
                          onClick={() => setDeleteTargetId(row._id)}
                          title="Delete quotation"
                          aria-label="Delete quotation"
                        >
                          <Trash2 className="size-3.5" aria-hidden />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Table View */
            <div className="overflow-x-auto">
              <table className="w-full min-w-[65rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-border/80 bg-muted/30 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground dark:bg-muted/15">
                    <th className="px-5 py-3.5">Quotation #</th>
                    <th className="px-3 py-3.5">Project</th>
                    <th className="px-3 py-3.5">Total</th>
                    <th className="px-3 py-3.5">PO links</th>
                    <th className="px-3 py-3.5">Status</th>
                    <th className="px-3 py-3.5">Created</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {displayedRows.map((row) => {
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
                        <td className="px-5 py-3.5 font-bold text-foreground">
                          {row.quotationNumber ?? "—"}
                        </td>
                        <td className="max-w-48 px-3 py-3.5 text-muted-foreground font-medium">
                          <span className="line-clamp-2">{row.projectName || "—"}</span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3.5 tabular-nums text-foreground font-bold">
                          {row.totalAmount != null ? `AED ${formatMoney(row.totalAmount ?? null)}` : "—"}
                        </td>
                        <td className="max-w-48 px-3 py-3.5 align-middle">
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
                        <td className="px-3 py-3.5 align-middle">
                          <QuotationStatusEditor
                            quotationId={row._id}
                            currentStatus={normalizeQuotationStatus(row.status)}
                            onUpdated={() => fetchList().catch(() => {})}
                            variant="inline"
                          />
                        </td>
                        <td className="whitespace-nowrap px-3 py-3.5 text-muted-foreground tabular-nums font-medium">
                          {row.createdAt
                            ? new Date(row.createdAt).toLocaleDateString(undefined, {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })
                            : "—"}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-right align-middle">
                          <div className="flex flex-nowrap items-center justify-end gap-1.5">
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              className="h-8 w-8 rounded-lg p-0"
                              title="View quotation details"
                              aria-label="View quotation details"
                              asChild
                            >
                              <Link href={`${pathPrefix}/quotations/${row._id}`}>
                                <Eye className="size-4" aria-hidden />
                              </Link>
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 rounded-lg p-0"
                              disabled={busy}
                              onClick={() => loadQuotation(row._id)}
                              title="Load into builder"
                              aria-label="Load into builder"
                            >
                              {busy ? (
                                <Loader2 className="size-4 animate-spin" aria-hidden />
                              ) : (
                                <FileEdit className="size-4" aria-hidden />
                              )}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 rounded-lg p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                              disabled={busy}
                              onClick={() => setDeleteTargetId(row._id)}
                              title="Delete quotation"
                              aria-label="Delete quotation"
                            >
                              <Trash2 className="size-4" aria-hidden />
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

          {/* Full Pagination Footer Bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-border/60 bg-muted/20 px-5 py-4 dark:bg-muted/10">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <span>
                Showing{" "}
                <strong className="text-foreground">
                  {total === 0 ? 0 : (page - 1) * limit + 1}
                </strong>{" "}
                to{" "}
                <strong className="text-foreground">
                  {Math.min(page * limit, total)}
                </strong>{" "}
                of <strong className="text-foreground">{total}</strong> quotations
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Items per page selector */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Per page:</span>
                <Select
                  id="quotations-limit-select"
                  value={String(limit)}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  options={[
                    { value: "6", label: "6" },
                    { value: "9", label: "9" },
                    { value: "12", label: "12" },
                    { value: "24", label: "24" },
                  ]}
                  className="h-8 text-xs w-16 bg-background rounded-lg"
                  aria-label="Quotations per page"
                />
              </div>

              {/* Page buttons */}
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || listLoading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-8 px-2.5 text-xs gap-1 rounded-lg"
                >
                  <ChevronLeft className="size-3.5" aria-hidden />
                  Prev
                </Button>

                <span className="px-2 text-xs font-semibold text-muted-foreground">
                  <strong className="text-foreground">{page}</strong> /{" "}
                  <strong className="text-foreground">{totalPages}</strong>
                </span>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages || listLoading}
                  onClick={() => setPage((p) => p + 1)}
                  className="h-8 px-2.5 text-xs gap-1 rounded-lg"
                >
                  Next
                  <ChevronRight className="size-3.5" aria-hidden />
                </Button>
              </div>
            </div>
          </div>
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
