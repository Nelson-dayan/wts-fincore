"use client";

import { useEffect, useState } from "react";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Row = Record<string, unknown> & { _id?: string };
type ApiPayload = { items?: Row[]; item?: Row | null; message?: string };

interface ResourceTableClientProps {
  title: string;
  description: string;
  endpoint: string;
  columns: Array<{ key: string; label: string }>;
  singleItem?: boolean;
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
}: ResourceTableClientProps) {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const response = await fetch(endpoint, { cache: "no-store" });
        const payload = (await response.json()) as ApiPayload;
        if (!response.ok) {
          throw new Error(payload.message ?? "Request failed");
        }

        const loadedRows = singleItem
          ? payload.item
            ? [payload.item]
            : []
          : payload.items ?? [];

        if (alive) setRows(loadedRows);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Failed to load data");
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [endpoint, singleItem]);

  return (
    <div className="animate-[fade-in_0.4s_ease-out_both]">
      <DashboardPageHeader title={title} description={description} />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {title} ({rows.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  );
}
