"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileText, Loader2, Plus, Trash2 } from "lucide-react";
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
import { cn } from "@/lib/utils/cn";
import type { QuotationData } from "@/types/quotation-generator";

type QuotationRow = {
  _id: string;
  quotationNumber?: string;
  status?: string;
  projectName?: string;
  createdAt?: string;
};

export function AdminQuotationsClient({
  initialProjectId = "",
}: {
  initialProjectId?: string;
}) {
  const [rows, setRows] = useState<QuotationRow[]>([]);
  const [total, setTotal] = useState(0);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [builderOpen, setBuilderOpen] = useState(false);
  const [builderKey, setBuilderKey] = useState(0);
  const [editingQuotationId, setEditingQuotationId] = useState<string | null>(null);
  const [initialSnapshot, setInitialSnapshot] = useState<QuotationData | null>(null);
  const [rowBusyId, setRowBusyId] = useState("");

  const fetchList = useCallback(async () => {
    setListLoading(true);
    setListError("");
    try {
      const q = initialProjectId
        ? `?limit=200&projectId=${encodeURIComponent(initialProjectId)}`
        : "?limit=200";
      const res = await fetch(`/api/admin/quotations${q}`, {
        credentials: "include",
        cache: "no-store",
      });
      const payload = (await res.json()) as {
        items?: QuotationRow[];
        total?: number;
        message?: string;
      };
      if (!res.ok) throw new Error(payload.message ?? "Failed to load quotations");
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
  }, [initialProjectId]);

  useEffect(() => {
    fetchList().catch(() => {});
  }, [fetchList]);

  const openNew = useCallback(() => {
    setEditingQuotationId(null);
    setInitialSnapshot(null);
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
      const res = await fetch(`/api/admin/quotations/${id}`, {
        credentials: "include",
        cache: "no-store",
      });
      const payload = (await res.json()) as { item?: Record<string, unknown>; message?: string };
      if (!res.ok) throw new Error(payload.message ?? "Failed to load quotation");
      if (!payload.item) throw new Error("Missing quotation");
      const data = quotationItemToGeneratorData(
        payload.item as Parameters<typeof quotationItemToGeneratorData>[0]
      );
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
  }, []);

  const deleteQuotation = useCallback(
    async (id: string) => {
      setRowBusyId(id);
      setListError("");
      try {
        const res = await fetch(`/api/admin/quotations/${id}`, {
          method: "DELETE",
          credentials: "include",
        });
        const raw = await res.text();
        const payload = raw ? (JSON.parse(raw) as { message?: string }) : {};
        if (!res.ok) {
          throw new Error(
            payload.message ??
              (res.status === 400
                ? "This quotation cannot be deleted."
                : "Delete failed")
          );
        }
        await fetchList();
      } catch (e) {
        setListError(e instanceof Error ? e.message : "Delete failed");
      } finally {
        setRowBusyId("");
      }
    },
    [fetchList]
  );

  const closeBuilder = useCallback(() => {
    setBuilderOpen(false);
    setEditingQuotationId(null);
    setInitialSnapshot(null);
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

  return (
    <div className="animate-fade-in">
      {initialProjectId ? (
        <Link
          href={`/admin/projects/${initialProjectId}`}
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
                  Load to edit the same record, or delete when no purchase order is linked.
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
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
              <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
              <p className="text-sm font-medium">Loading quotations…</p>
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
              <table className="w-full min-w-160 text-left text-sm">
                <thead>
                  <tr className="border-b border-border/80 bg-muted/30 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground dark:bg-muted/15">
                    <th className="px-5 py-3.5 pr-3">Quotation #</th>
                    <th className="px-0 py-3.5 pr-3">Project</th>
                    <th className="px-0 py-3.5 pr-3">Status</th>
                    <th className="px-0 py-3.5 pr-3">Created</th>
                    <th className="px-0 py-3.5 pr-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {rows.map((row) => {
                    const busy = rowBusyId === row._id;
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
                        <td className="px-0 py-3.5 pr-3">
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                              row.status === "approved"
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                                : row.status === "rejected"
                                  ? "bg-destructive/15 text-destructive"
                                  : "bg-muted text-muted-foreground"
                            )}
                          >
                            {row.status ?? "—"}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-0 py-3.5 pr-3 text-muted-foreground tabular-nums">
                          {row.createdAt
                            ? new Date(row.createdAt).toLocaleString()
                            : "—"}
                        </td>
                        <td className="px-0 py-3.5 pr-5 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="secondary"
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
                              size="sm"
                              className="rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"
                              disabled={busy}
                              onClick={() => deleteQuotation(row._id)}
                            >
                              <Trash2 className="size-4" aria-hidden />
                              <span className="sr-only sm:not-sr-only sm:ml-1">Delete</span>
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
            editingQuotationId={editingQuotationId}
            initialSnapshot={initialSnapshot}
            onDbSaveSuccess={onDbSaveSuccess}
            onCancelEdit={closeBuilder}
          />
        </section>
      ) : null}
    </div>
  );
}
