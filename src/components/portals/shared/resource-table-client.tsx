"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api/client";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Search, ChevronLeft, ChevronRight, Eye, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";

type Row = Record<string, unknown> & { _id?: string };

type ResourceData = {
  items?: Row[];
  users?: Row[];
  item?: Row | null;
  page?: number;
  limit?: number;
  total?: number;
  hasMore?: boolean;
};

interface ResourceTableClientProps {
  title: string;
  description: string;
  endpoint: string;
  columns: Array<{ key: string; label: string }>;
  singleItem?: boolean;
  searchable?: boolean;
  rowDetailPathPrefix?: string;
  rowDetailHash?: string;
  extraRowLinks?: Array<{ label: string; hrefPattern: string }>;
  emptyMessage?: string;
  showPageHeader?: boolean;
  refreshKey?: number;
  onDelete?: (id: string) => Promise<void>;
  onView?: (id: string) => void;
  customCellRenders?: Record<string, (value: any, row: any) => React.ReactNode>;
}

function renderStatusBadge(statusStr: string) {
  const val = statusStr.toLowerCase();
  let colorClasses = "bg-muted text-muted-foreground border-border";

  if (val === "paid" || val === "approved" || val === "completed" || val === "active") {
    colorClasses = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
  } else if (val === "partial" || val === "pending" || val === "sent" || val === "in_progress") {
    colorClasses = "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
  } else if (val === "overdue" || val === "rejected" || val === "cancelled" || val === "inactive") {
    colorClasses = "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
  } else if (val === "draft" || val === "new") {
    colorClasses = "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
  }

  return (
    <span className={cn("inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide", colorClasses)}>
      {statusStr}
    </span>
  );
}

function formatCell(value: unknown, key = ""): React.ReactNode {
  if (value == null || value === "") return <span className="text-muted-foreground">—</span>;
  if (typeof value === "boolean") {
    return (
      <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold", value ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground")}>
        {value ? "Yes" : "No"}
      </span>
    );
  }

  if (key.toLowerCase().includes("status") && typeof value === "string") {
    return renderStatusBadge(value);
  }

  if (typeof value === "number" || (typeof value === "string" && !isNaN(Number(value)) && (key.toLowerCase().includes("total") || key.toLowerCase().includes("amount") || key.toLowerCase().includes("price")))) {
    const num = Number(value);
    return (
      <span className="font-mono font-bold tabular-nums text-foreground">
        {new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num)}
      </span>
    );
  }

  if (typeof value === "string") {
    const maybeDate = Date.parse(value);
    if (!Number.isNaN(maybeDate) && value.includes("T")) {
      return (
        <span className="font-mono text-xs text-muted-foreground tabular-nums">
          {new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
        </span>
      );
    }
    return <span className="text-foreground font-medium">{value}</span>;
  }

  if (key.toLowerCase().includes("company")) {
    if (typeof value === "string" && value) {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 border border-primary/20 px-2 py-0.5 text-[11px] font-semibold text-primary">
          {value}
        </span>
      );
    }
    if (typeof value === "object" && value !== null) {
      const obj = value as Record<string, any>;
      const name = obj.name || obj.companyName || obj.code || "Company";
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 border border-primary/20 px-2 py-0.5 text-[11px] font-semibold text-primary">
          {name}
        </span>
      );
    }
  }

  if (typeof value === "object" && value !== null) {
    const obj = value as Record<string, any>;
    if (obj.invoiceNumber) return <span className="font-bold text-foreground">{String(obj.invoiceNumber)}</span>;
    if (obj.name) return <span className="font-medium text-foreground">{String(obj.name)}</span>;
    if (obj.email) return <span className="text-muted-foreground">{String(obj.email)}</span>;

    const decimalLike = value as { $numberDecimal?: string; toString?: () => string };
    if (decimalLike.$numberDecimal) {
      return <span className="font-mono font-bold tabular-nums">{decimalLike.$numberDecimal}</span>;
    }
    if (typeof decimalLike.toString === "function") {
      const parsed = decimalLike.toString();
      if (parsed !== "[object Object]") return <span>{parsed}</span>;
    }
  }

  return <span>{String(value)}</span>;
}

export function ResourceTableClient({
  title,
  description,
  endpoint,
  columns,
  singleItem = false,
  searchable = true,
  rowDetailPathPrefix,
  rowDetailHash = "",
  extraRowLinks,
  emptyMessage = "No records matching current criteria.",
  showPageHeader = true,
  refreshKey = 0,
  onDelete,
  onView,
  customCellRenders,
}: ResourceTableClientProps) {
  const detailPrefix = rowDetailPathPrefix?.replace(/\/$/, "") ?? "";
  const hasActionsCol = Boolean(detailPrefix || (extraRowLinks && extraRowLinks.length > 0) || onDelete || onView);
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const qs = new URLSearchParams({
          page: String(page),
          limit: String(limit),
          q: query,
        });
        const separator = endpoint.includes("?") ? "&" : "?";
        const data = await apiFetch<ResourceData>(`${endpoint}${separator}${qs.toString()}`);

        const loadedRows = singleItem
          ? data.item
            ? [data.item]
            : []
          : data.items ?? data.users ?? [];

        if (alive) {
          setRows(loadedRows);
          setTotal(data.total ?? loadedRows.length);
        }
      } catch (e) {
        if (alive) {
          setError(e instanceof Error ? e.message : "Failed to load data");
          setRows([]);
          setTotal(0);
        }
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [endpoint, singleItem, page, query, refreshKey]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-6 animate-in fade-in-50">
      {showPageHeader ? <DashboardPageHeader title={title} description={description} /> : null}
      
      <Card className="bg-card border-border/80 shadow-xs overflow-hidden">
        <CardHeader className="border-b border-border/60 bg-muted/20 px-6 py-4 dark:bg-muted/10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <span>{title}</span>
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary font-mono">
                {total}
              </span>
            </CardTitle>

            {!singleItem && searchable ? (
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => {
                    setPage(1);
                    setQuery(e.target.value);
                  }}
                  placeholder={`Search ${title.toLowerCase()}...`}
                  className="h-8 pl-9 text-xs bg-background rounded-lg border-border/80"
                />
              </div>
            ) : null}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {error ? (
            <div className="m-6 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm font-medium text-destructive">
              {error}
            </div>
          ) : loading ? (
            <div className="overflow-x-auto" aria-busy="true">
              <table className="w-full min-w-[50rem] text-left text-xs">
                <thead>
                  <tr className="border-b border-border/80 bg-muted/30 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground dark:bg-muted/15">
                    {columns.map((column) => (
                      <th key={column.key} className="px-5 py-3">
                        {column.label}
                      </th>
                    ))}
                    {hasActionsCol ? (
                      <th className="px-5 py-3 text-right">
                        <span className="sr-only">Actions</span>
                      </th>
                    ) : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {Array.from({ length: 6 }).map((_, ri) => (
                    <tr key={ri} className="bg-card">
                      {columns.map((column) => (
                        <td key={column.key} className="px-5 py-3.5">
                          <Skeleton className="h-4 w-full max-w-[8rem]" />
                        </td>
                      ))}
                      {hasActionsCol ? (
                        <td className="px-5 py-3.5 text-right">
                          <Skeleton className="ml-auto h-7 w-12 rounded-lg" />
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[50rem] text-left text-xs">
                <thead>
                  <tr className="border-b border-border/80 bg-muted/30 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground dark:bg-muted/15">
                    {columns.map((column) => (
                      <th key={column.key} className="px-5 py-3">
                        {column.label}
                      </th>
                    ))}
                    {hasActionsCol ? (
                      <th className="px-5 py-3 text-right">Actions</th>
                    ) : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={columns.length + (hasActionsCol ? 1 : 0)}
                        className="text-muted-foreground py-12 px-6 text-center text-xs leading-relaxed"
                      >
                        {emptyMessage}
                      </td>
                    </tr>
                  ) : (
                    rows.map((row, index) => (
                      <tr
                        key={String(row._id ?? index)}
                        className="bg-card transition-colors hover:bg-muted/30 dark:hover:bg-muted/15"
                      >
                        {columns.map((column) => (
                          <td key={column.key} className="px-5 py-3.5 align-middle">
                            {customCellRenders && customCellRenders[column.key]
                              ? customCellRenders[column.key](row[column.key], row)
                              : formatCell(row[column.key], column.key)}
                          </td>
                        ))}
                        {hasActionsCol ? (
                          <td className="whitespace-nowrap px-5 py-3.5 text-right align-middle">
                            {row._id ? (
                              <div className="flex flex-nowrap items-center justify-end gap-1.5">
                                {detailPrefix ? (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7.5 px-2 text-xs font-semibold gap-1 hover:bg-primary/10 hover:text-primary rounded-md"
                                    asChild
                                  >
                                    <Link href={`${detailPrefix}/${encodeURIComponent(String(row._id))}${rowDetailHash}`}>
                                      <Eye className="size-3.5" />
                                      <span>Open</span>
                                    </Link>
                                  </Button>
                                ) : null}
                                {(extraRowLinks ?? []).map((link) => {
                                  let href = link.hrefPattern.replace("{id}", encodeURIComponent(String(row._id || "")));
                                  const matches = href.match(/\{([^}]+)\}/g);
                                  if (matches) {
                                    matches.forEach((match) => {
                                      const field = match.slice(1, -1);
                                      if (field !== "id" && row[field]) {
                                        const val =
                                          typeof row[field] === "object" && row[field] !== null
                                            ? (row[field] as any)._id || row[field]
                                            : row[field];
                                        href = href.replace(match, encodeURIComponent(String(val || "")));
                                      }
                                    });
                                  }

                                  return (
                                    <Button
                                      key={link.label}
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-7.5 px-2 text-xs font-semibold gap-1 border-border/80 rounded-md"
                                      asChild
                                    >
                                      <Link href={href}>
                                        <ExternalLink className="size-3.5" />
                                        <span>{link.label}</span>
                                      </Link>
                                    </Button>
                                  );
                                })}
                                {onView ? (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7.5 px-2 text-xs font-semibold gap-1 hover:bg-primary/10 hover:text-primary rounded-md"
                                    onClick={() => onView(String(row._id))}
                                  >
                                    <Eye className="size-3.5" />
                                    <span>View</span>
                                  </Button>
                                ) : null}
                                {onDelete ? (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7.5 w-7.5 p-0 text-destructive hover:bg-destructive/10 rounded-md"
                                    disabled={confirmDeleteId === String(row._id) && isDeleting}
                                    onClick={() => setConfirmDeleteId(String(row._id))}
                                    title="Delete record"
                                  >
                                    <Trash2 className="size-3.5" />
                                  </Button>
                                ) : null}
                              </div>
                            ) : (
                              "—"
                            )}
                          </td>
                        ) : null}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {!singleItem ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-border/60 bg-muted/20 px-6 py-3.5 dark:bg-muted/10">
              <span className="text-xs text-muted-foreground font-mono">
                Showing <strong className="text-foreground">{total === 0 ? 0 : (page - 1) * limit + 1}</strong> - <strong className="text-foreground">{Math.min(page * limit, total)}</strong> of <strong className="text-foreground">{total}</strong>
              </span>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={loading || page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-7.5 px-2.5 text-xs gap-1 rounded-md"
                >
                  <ChevronLeft className="size-3.5" />
                  Prev
                </Button>
                <span className="text-xs font-mono font-semibold text-muted-foreground px-1">
                  {page} / {totalPages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={loading || page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="h-7.5 px-2.5 text-xs gap-1 rounded-md"
                >
                  Next
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {confirmDeleteId && (
        <ConfirmDialog
          open={Boolean(confirmDeleteId)}
          onOpenChange={(isOpen) => {
            if (!isOpen) setConfirmDeleteId(null);
          }}
          title="Confirm Delete"
          description="Are you sure you want to delete this record? This action cannot be undone."
          confirmLabel="Delete"
          cancelLabel="Cancel"
          variant="destructive"
          loading={isDeleting}
          onConfirm={async () => {
            setIsDeleting(true);
            try {
              if (onDelete) {
                await onDelete(confirmDeleteId);
              }
            } catch (err) {
              alert(err instanceof Error ? err.message : "Delete failed");
            } finally {
              setIsDeleting(false);
              setConfirmDeleteId(null);
            }
          }}
        />
      )}
    </div>
  );
}
