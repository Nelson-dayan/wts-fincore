"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FileSpreadsheet, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  invoiceCountAtOrOverCap,
  MAX_INVOICES_PER_PURCHASE_ORDER,
} from "@/lib/invoice/invoice-limits";
import { readResponseJson } from "@/lib/http/read-response-json";
import { usePortalConfig } from "@/components/portals/portal-config-context";

type Row = {
  _id: string;
  invoiceNumber: string;
  status: string;
  total: number;
  createdAt: string;
};

export function PurchaseOrderInvoicesSection({
  purchaseOrderId,
  poNumber,
}: {
  purchaseOrderId: string;
  poNumber: string;
}) {
  const { apiPrefix, pathPrefix } = usePortalConfig();
  const [rows, setRows] = useState<Row[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const atCap = invoiceCountAtOrOverCap(totalCount);

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const qs = new URLSearchParams({
        poId: purchaseOrderId,
        page: "1",
        limit: "10",
        q: "",
      });
      const res = await fetch(`${apiPrefix}/invoices?${qs}`, { cache: "no-store" });
      const data = await readResponseJson<{ items?: Row[]; message?: string; total?: number }>(
        res
      );
      if (!res.ok) throw new Error(data.message ?? "Failed to load invoices");
      setTotalCount(typeof data.total === "number" ? data.total : (data.items ?? []).length);
      setRows(
        (data.items ?? []).map((r) => ({
          _id: r._id,
          invoiceNumber: r.invoiceNumber,
          status: r.status,
          total: typeof r.total === "number" ? r.total : Number(r.total),
          createdAt: String(r.createdAt ?? ""),
        }))
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
      setRows([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [apiPrefix, purchaseOrderId]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  return (
    <Card
      id="po-invoices"
      className="mb-6 border-2 border-primary/30 bg-primary/6 shadow-sm dark:border-primary/40 dark:bg-primary/10"
    >
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-lg font-semibold inline-flex items-center gap-2 tracking-tight">
            <FileSpreadsheet className="size-5 opacity-90 text-primary" aria-hidden />
            Invoices
            {MAX_INVOICES_PER_PURCHASE_ORDER != null
              ? ` (max ${MAX_INVOICES_PER_PURCHASE_ORDER} / PO)`
              : ""}
          </CardTitle>
          <p className="text-muted-foreground text-[0.8125rem]">
            <span className="font-mono font-semibold text-foreground">{poNumber}</span>
            {" · "}
            <span className="font-medium text-foreground">{totalCount}</span>
            {MAX_INVOICES_PER_PURCHASE_ORDER != null
              ? ` / ${MAX_INVOICES_PER_PURCHASE_ORDER} used`
              : " linked"}
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {err ? (
          <p className="text-destructive text-sm" role="alert">
            {err}
          </p>
        ) : null}
        {!err && !loading && !atCap ? (
          <Button size="default" className="w-full gap-2 sm:w-auto" asChild>
            <Link href={`${pathPrefix}/invoices/new?poId=${encodeURIComponent(purchaseOrderId)}`}>
              <Plus className="size-4" aria-hidden />
              New invoice from this PO
            </Link>
          </Button>
        ) : null}
        {loading ? (
          <div className="space-y-2.5">
            <Skeleton className="h-9 w-52" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No invoices yet. Use <strong className="text-foreground">New invoice from this PO</strong> — the
            document is built from this <strong className="text-foreground">{poNumber}</strong> and its linked{" "}
            <strong className="text-foreground">quotation</strong> client and company snapshot.
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {rows.map((r) => (
              <li
                key={r._id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 dark:bg-muted/10"
              >
                <span className="font-medium">{r.invoiceNumber}</span>
                <span className="text-muted-foreground capitalize">{r.status}</span>
                <span className="tabular-nums text-muted-foreground">
                  AED{" "}
                  {Number(r.total).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
                <Button size="sm" variant="outline" asChild>
                  <Link href={`${pathPrefix}/invoices/${r._id}`}>Open</Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
        {atCap && MAX_INVOICES_PER_PURCHASE_ORDER != null ? (
          <p className="text-muted-foreground text-sm">
            This PO already has the maximum of {MAX_INVOICES_PER_PURCHASE_ORDER} invoices — link a new PO or open
            an existing invoice to edit it.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
