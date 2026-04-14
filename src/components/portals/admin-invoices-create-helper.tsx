"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FilePlus2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  invoiceCountAtOrOverCap,
  MAX_INVOICES_PER_PURCHASE_ORDER,
} from "@/lib/invoice/invoice-limits";
import { readResponseJson } from "@/lib/http/read-response-json";

type PoRow = { _id: string; poNumber: string; quotationNumber?: string };

export function AdminInvoicesCreateHelper({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [pos, setPos] = useState<PoRow[]>([]);
  const [loadingPo, setLoadingPo] = useState(true);
  const [poError, setPoError] = useState("");
  const [selectedPoId, setSelectedPoId] = useState("");
  const [manualPoId, setManualPoId] = useState("");
  const [invoiceCounts, setInvoiceCounts] = useState<Record<string, number>>({});
  const [invoiceType, setInvoiceType] = useState<"aed" | "usd">("aed");

  const loadPos = useCallback(async () => {
    setLoadingPo(true);
    setPoError("");
    try {
      const qs = new URLSearchParams({ page: "1", limit: "25", q: "" });
      if (projectId) qs.set("projectId", projectId);
      const res = await fetch(`/api/admin/purchase-orders?${qs}`, { cache: "no-store" });
      const data = await readResponseJson<{ items?: PoRow[]; message?: string }>(res);
      if (!res.ok) throw new Error(data.message ?? "Could not load POs");
      const list = data.items ?? [];
      setPos(list);

      const counts: Record<string, number> = {};
      for (const p of list) {
        try {
          const ir = await fetch(
            `/api/admin/invoices?poId=${encodeURIComponent(p._id)}&page=1&limit=10&q=`,
            { cache: "no-store" }
          );
          const ij = await readResponseJson<{ total?: number }>(ir);
          counts[p._id] = ir.ok && typeof ij.total === "number" ? ij.total : 0;
        } catch {
          counts[p._id] = 0;
        }
      }
      setInvoiceCounts(counts);

      setSelectedPoId((prev) => {
        if (prev && list.some((p) => p._id === prev)) return prev;
        return list[0]?._id ?? "";
      });
    } catch (e) {
      setPoError(e instanceof Error ? e.message : "Could not load POs");
      setPos([]);
    } finally {
      setLoadingPo(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadPos().catch(() => {});
  }, [loadPos]);

  function goCreate(poId: string) {
    const id = poId.trim();
    if (!id) return;
    router.push(
      `/admin/invoices/new?poId=${encodeURIComponent(id)}&invoiceType=${encodeURIComponent(invoiceType)}`
    );
  }

  const selectedCount = selectedPoId ? (invoiceCounts[selectedPoId] ?? 0) : 0;
  const atCapSelected =
    Boolean(selectedPoId) && invoiceCountAtOrOverCap(selectedCount);

  return (
    <Card className="mb-6 border-primary/25 bg-primary/4 dark:border-primary/35 dark:bg-primary/8">
      <CardHeader className="pb-2">
        <CardTitle className="text-base inline-flex items-center gap-2">
          <FilePlus2 className="size-4 opacity-90" aria-hidden />
          New invoice
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" asChild className="gap-2">
            <Link href="/admin/purchase-orders">
              <Package className="size-4" aria-hidden />
              All purchase orders
            </Link>
          </Button>
          {projectId ? (
            <Button size="sm" variant="outline" asChild>
              <Link href={`/admin/projects/${encodeURIComponent(projectId)}`}>Back to project</Link>
            </Button>
          ) : null}
        </div>

        {poError ? (
          <p className="text-destructive text-sm" role="alert">
            {poError}
          </p>
        ) : null}

        {loadingPo ? (
          <p className="text-muted-foreground text-sm">Loading purchase orders…</p>
        ) : pos.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No purchase orders yet. Open a{" "}
            <Link href="/admin/quotations" className="text-primary underline-offset-4 hover:underline">
              quotation
            </Link>{" "}
            and create a PO from there first.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="inv-po-pick">Purchase order</Label>
              <select
                id="inv-po-pick"
                value={selectedPoId}
                onChange={(e) => setSelectedPoId(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-input/90 bg-background px-3 text-sm"
              >
                {pos.map((p) => {
                  const n = invoiceCounts[p._id];
                  const cap =
                    typeof n === "number" &&
                    MAX_INVOICES_PER_PURCHASE_ORDER != null &&
                    invoiceCountAtOrOverCap(n)
                      ? " (full)"
                      : "";
                  return (
                    <option key={p._id} value={p._id}>
                      {p.poNumber}
                      {p.quotationNumber ? ` · ${p.quotationNumber}` : ""}
                      {cap}
                    </option>
                  );
                })}
              </select>
              {selectedPoId ? (
                <p className="text-muted-foreground text-[0.75rem]">
                  {selectedCount} invoice(s) on this PO
                  {MAX_INVOICES_PER_PURCHASE_ORDER != null
                    ? ` (max ${MAX_INVOICES_PER_PURCHASE_ORDER}).`
                    : "."}
                  {atCapSelected ? " Limit reached — choose another PO." : ""}
                </p>
              ) : null}
              <div className="pt-1">
                <Label htmlFor="invoice-type">Invoice type</Label>
                <select
                  id="invoice-type"
                  value={invoiceType}
                  onChange={(e) => setInvoiceType(e.target.value === "usd" ? "usd" : "aed")}
                  className="mt-1 flex h-10 w-full rounded-lg border border-input/90 bg-background px-3 text-sm"
                >
                  <option value="aed">AED Invoice</option>
                  <option value="usd">USD Invoice</option>
                </select>
              </div>
            </div>
            <Button
              type="button"
              className="w-full sm:w-auto"
              disabled={!selectedPoId || atCapSelected}
              onClick={() => goCreate(selectedPoId)}
            >
              Create invoice
            </Button>
          </div>
        )}

        <div className="border-t border-border/60 pt-3">
          <p className="text-muted-foreground mb-2 text-[0.75rem] font-medium uppercase tracking-wide">
            Or paste a PO id
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              placeholder="e.g. 507f1f77bcf86cd799439011"
              value={manualPoId}
              onChange={(e) => setManualPoId(e.target.value)}
              className="font-mono text-sm sm:max-w-md"
            />
            <Button
              type="button"
              variant="secondary"
              disabled={!manualPoId.trim()}
              onClick={() => goCreate(manualPoId)}
            >
              Create with this PO id
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
