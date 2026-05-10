"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { readResponseJson } from "@/lib/http/read-response-json";

type Row = Record<string, unknown> & { _id?: string };
type ApiPayload = {
  items?: Row[];
  users?: Row[];
  item?: Row | null;
  page?: number;
  limit?: number;
  total?: number;
  hasMore?: boolean;
  message?: string;
};

interface ResourceTableClientProps {
  title: string;
  description: string;
  endpoint: string;
  columns: Array<{ key: string; label: string }>;
  singleItem?: boolean;
  searchable?: boolean;
  /**
   * Base path for row detail links (serializable from Server Components).
   * e.g. `/admin/purchase-orders` → link `/admin/purchase-orders/{_id}`.
   */
  rowDetailPathPrefix?: string;
  /** Appended to row detail links, e.g. `#section` to scroll after open. */
  rowDetailHash?: string;
  /**
   * Extra links per row; `{id}` is replaced with the row’s `_id` (URL-encoded).
   * e.g. `{ label: "Invoice", hrefPattern: "/admin/invoices/new?poId={id}" }`
   */
  extraRowLinks?: Array<{ label: string; hrefPattern: string }>;
  /** Shown in the table body when the API returns zero rows (not an error). */
  emptyMessage?: string;
  /** When false, skips the top DashboardPageHeader (use when the page supplies its own). */
  showPageHeader?: boolean;
  /** Increment to refetch the list with the same endpoint (e.g. after creating a row elsewhere on the page). */
  refreshKey?: number;
  /** Optional callback to handle row deletion. If provided, a Delete button is shown. */
  onDelete?: (id: string) => Promise<void>;
  /** Optional callback to handle row viewing. If provided, a View button is shown. */
  onView?: (id: string) => void;
}

function formatCell(value: unknown): string {
  if (value == null || value === "") return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string") {
    const maybeDate = Date.parse(value);
    if (!Number.isNaN(maybeDate) && value.includes("T")) {
      return new Date(value).toLocaleString();
    }
    return value;
  }
  if (typeof value === "object" && value !== null) {
    const obj = value as Record<string, any>;
    if (obj.invoiceNumber) return String(obj.invoiceNumber);
    if (obj.name) return String(obj.name);
    if (obj.email) return String(obj.email);
    
    const decimalLike = value as { $numberDecimal?: string; toString?: () => string };
    if (decimalLike.$numberDecimal) return decimalLike.$numberDecimal;
    if (typeof decimalLike.toString === "function") {
      const parsed = decimalLike.toString();
      if (parsed !== "[object Object]") return parsed;
    }
  }
  return String(value);
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
  emptyMessage =
    "No records match yet. Adjust search or add new data — the table updates after the list loads.",
  showPageHeader = true,
  refreshKey = 0,
  onDelete,
  onView,
}: ResourceTableClientProps) {
  const detailPrefix = rowDetailPathPrefix?.replace(/\/$/, "") ?? "";
  const hasActionsCol = Boolean(detailPrefix || (extraRowLinks && extraRowLinks.length > 0) || onDelete || onView);
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
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
        const response = await fetch(`${endpoint}${separator}${qs.toString()}`, {
          cache: "no-store",
        });
        const payload = await readResponseJson<ApiPayload>(response);
        if (!response.ok) {
          throw new Error(payload.message ?? "Request failed");
        }

        const loadedRows = singleItem
          ? payload.item
            ? [payload.item]
            : []
          : payload.items ?? payload.users ?? [];

        if (alive) {
          setRows(loadedRows);
          setTotal(payload.total ?? loadedRows.length);
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

  return (
    <div className="animate-fade-in">
      {showPageHeader ? <DashboardPageHeader title={title} description={description} /> : null}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {title} ({total})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!singleItem && searchable ? (
            <div className="mb-3">
              <input
                value={query}
                onChange={(e) => {
                  setPage(1);
                  setQuery(e.target.value);
                }}
                placeholder={`Search ${title.toLowerCase()}...`}
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm"
              />
            </div>
          ) : null}
          {error ? (
            <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
              {error}
            </div>
          ) : loading ? (
            <div className="overflow-x-auto" aria-busy="true">
              <table className="w-full min-w-190 text-left text-sm">
                <thead className="text-muted-foreground">
                  <tr>
                    {columns.map((column) => (
                      <th key={column.key} className="py-2 pr-3">
                        {column.label}
                      </th>
                    ))}
                    {hasActionsCol ? (
                      <th className="py-2 pr-3 text-right">
                        <span className="sr-only">Actions</span>
                      </th>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 8 }).map((_, ri) => (
                    <tr key={ri} className="border-t border-border/70">
                      {columns.map((column) => (
                        <td key={column.key} className="py-2.5 pr-3">
                          <Skeleton className="h-4 w-full max-w-32" />
                        </td>
                      ))}
                      {hasActionsCol ? (
                        <td className="py-2.5 pr-3 text-right">
                          <Skeleton className="ml-auto h-8 w-14" />
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-190 text-left text-sm">
                <thead className="text-muted-foreground">
                  <tr>
                    {columns.map((column) => (
                      <th key={column.key} className="py-2 pr-3">
                        {column.label}
                      </th>
                    ))}
                    {hasActionsCol ? (
                      <th className="py-2 pr-3 text-right">
                        <span className="sr-only">Actions</span>
                      </th>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr className="border-t border-border/70">
                      <td
                        colSpan={columns.length + (hasActionsCol ? 1 : 0)}
                        className="text-muted-foreground py-10 px-2 text-center text-sm leading-relaxed"
                      >
                        {emptyMessage}
                      </td>
                    </tr>
                  ) : (
                    rows.map((row, index) => (
                      <tr
                        key={String(row._id ?? index)}
                        className="border-t border-border/70"
                      >
                        {columns.map((column) => (
                          <td key={column.key} className="py-2 pr-3">
                            {formatCell(row[column.key])}
                          </td>
                        ))}
                        {hasActionsCol ? (
                          <td className="py-2 pr-3 text-right">
                            {row._id ? (
                              <span className="inline-flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
                                {detailPrefix ? (
                                  <Link
                                    href={`${detailPrefix}/${encodeURIComponent(String(row._id))}${rowDetailHash}`}
                                    className="text-primary text-sm font-medium underline-offset-4 hover:underline"
                                  >
                                    Open
                                  </Link>
                                ) : null}
                                {(extraRowLinks ?? []).map((link) => {
                                  let href = link.hrefPattern;
                                  // Replace {id} with _id
                                  href = href.replace("{id}", encodeURIComponent(String(row._id || "")));
                                  
                                  // Replace other {field} placeholders
                                  const matches = href.match(/\{([^}]+)\}/g);
                                  if (matches) {
                                    matches.forEach(match => {
                                      const field = match.slice(1, -1);
                                      if (field !== "id" && row[field]) {
                                        const val = typeof row[field] === 'object' && row[field] !== null 
                                          ? (row[field] as any)._id || row[field]
                                          : row[field];
                                        href = href.replace(match, encodeURIComponent(String(val || "")));
                                      }
                                    });
                                  }

                                  return (
                                    <Link
                                      key={link.label}
                                      href={href}
                                      className="text-primary text-sm font-medium underline-offset-4 hover:underline"
                                    >
                                      {link.label}
                                    </Link>
                                  );
                                })}
                                {onView ? (
                                  <button
                                    onClick={() => onView(String(row._id))}
                                    className="text-primary text-sm font-medium underline-offset-4 hover:underline"
                                  >
                                    View
                                  </button>
                                ) : null}
                                {onDelete ? (
                                  <button
                                    disabled={deletingId === String(row._id)}
                                    onClick={async () => {
                                      if (!window.confirm("Are you sure you want to delete this?")) return;
                                      setDeletingId(String(row._id));
                                      try {
                                        await onDelete(String(row._id));
                                      } catch (err) {
                                        alert(err instanceof Error ? err.message : "Delete failed");
                                      } finally {
                                        setDeletingId(null);
                                      }
                                    }}
                                    className="text-destructive text-sm font-medium underline-offset-4 hover:underline disabled:opacity-50"
                                  >
                                    {deletingId === String(row._id) ? "..." : "Delete"}
                                  </button>
                                ) : null}
                              </span>
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
            <div className="mt-4 flex items-center justify-between text-sm">
              <button
                className="rounded-md border border-border px-3 py-1.5 disabled:opacity-50"
                disabled={loading || page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <span className="text-muted-foreground">
                Page {page} of {Math.max(1, Math.ceil(total / limit))}
              </span>
              <button
                className="rounded-md border border-border px-3 py-1.5 disabled:opacity-50"
                disabled={loading || page >= Math.max(1, Math.ceil(total / limit))}
                onClick={() =>
                  setPage((p) => Math.min(Math.ceil(total / limit), p + 1))
                }
              >
                Next
              </button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
