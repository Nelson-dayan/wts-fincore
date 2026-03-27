"use client";

import { useEffect, useState } from "react";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
}

function formatCell(value: unknown): string {
  if (value == null || value === "") return "-";
  if (typeof value === "string") {
    const maybeDate = Date.parse(value);
    if (!Number.isNaN(maybeDate) && value.includes("T")) {
      return new Date(value).toLocaleString();
    }
    return value;
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
}: ResourceTableClientProps) {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const qs = new URLSearchParams({
          page: String(page),
          limit: String(limit),
          q: query,
        });
        const response = await fetch(`${endpoint}?${qs.toString()}`, {
          cache: "no-store",
        });
        const payload = (await response.json()) as ApiPayload;
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
        if (alive) setError(e instanceof Error ? e.message : "Failed to load data");
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [endpoint, singleItem, page, query]);

  return (
    <div className="animate-[fade-in_0.4s_ease-out_both]">
      <DashboardPageHeader title={title} description={description} />
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
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
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
                  {rows.map((row, index) => (
                    <tr
                      key={String(row._id ?? index)}
                      className="border-t border-border/70"
                    >
                      {columns.map((column) => (
                        <td key={column.key} className="py-2 pr-3">
                          {formatCell(row[column.key])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!singleItem ? (
            <div className="mt-4 flex items-center justify-between text-sm">
              <button
                className="rounded-md border border-border px-3 py-1.5 disabled:opacity-50"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <span className="text-muted-foreground">
                Page {page} of {Math.max(1, Math.ceil(total / limit))}
              </span>
              <button
                className="rounded-md border border-border px-3 py-1.5 disabled:opacity-50"
                disabled={page >= Math.max(1, Math.ceil(total / limit))}
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
