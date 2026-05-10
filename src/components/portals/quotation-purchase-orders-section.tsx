"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FileSpreadsheet, FileText, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { readResponseJson } from "@/lib/http/read-response-json";
import { usePortalConfig } from "@/components/portals/portal-config-context";

type PoRow = {
  _id: string;
  poNumber: string;
  type: string;
  status: string;
  createdAt: string;
  hasFile?: boolean;
};

/** Align with server MAX_PO_FILE_BYTES (keep client-only to avoid importing Node helpers). */
const MAX_PO_UPLOAD_BYTES = 9 * 1024 * 1024;

export function QuotationPurchaseOrdersSection({
  quotationId,
  projectId,
  quotationStatus,
  quotationNumber,
}: {
  quotationId: string;
  projectId: string;
  quotationStatus: "draft" | "sent" | "approved" | "rejected";
  quotationNumber: string;
}) {
  const { apiPrefix, pathPrefix } = usePortalConfig();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileKey, setFileKey] = useState(0);
  const [rows, setRows] = useState<PoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");
  const [formOk, setFormOk] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setListError("");
    try {
      const qs = new URLSearchParams({
        quotationId,
        page: "1",
        limit: "50",
        q: "",
      });
      const res = await fetch(`${apiPrefix}/purchase-orders?${qs}`, { cache: "no-store" });
      const data = await readResponseJson<{
        items?: Array<PoRow & { hasFile?: boolean }>;
        message?: string;
      }>(res);
      if (!res.ok) throw new Error(data.message ?? "Failed to load POs");
      setRows(
        (data.items ?? []).map((r) => ({
          _id: r._id,
          poNumber: r.poNumber,
          type: r.type,
          status: r.status,
          createdAt: r.createdAt,
          hasFile: Boolean(r.hasFile),
        }))
      );
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Failed to load");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [apiPrefix, quotationId]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  async function createClientPo() {
    setFormError("");
    setFormOk("");
    if (!file) {
      setFormError("Choose a PDF or image first.");
      return;
    }
    if (file.size > MAX_PO_UPLOAD_BYTES) {
      setFormError("File is too large — use a PDF or image under ~9 MB.");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch(`${apiPrefix}/purchase-orders`, {
        method: "POST",
        body: (() => {
          const fd = new FormData();
          fd.set("quotationId", quotationId);
          fd.set("type", "client");
          fd.set("file", file);
          return fd;
        })(),
      });
      const data = await readResponseJson<{ message?: string; poNumber?: string }>(res);
      if (!res.ok) throw new Error(data.message ?? "Could not create PO");
      setFormOk(`PO ${data.poNumber ?? ""} saved.`);
      setFile(null);
      setFileKey((k) => k + 1);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not create PO");
    } finally {
      setCreating(false);
    }
  }

  return (
    <Card
      id="quotation-upload-po"
      className="mb-6 border-2 border-emerald-500/40 bg-emerald-500/[0.07] dark:border-emerald-500/45 dark:bg-emerald-500/10"
    >
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <CardTitle className="text-lg font-semibold inline-flex items-center gap-2 tracking-tight">
            <Upload className="size-5 text-emerald-600 dark:text-emerald-400" aria-hidden />
            Client PO upload — {quotationNumber}
          </CardTitle>
          <div
            className="rounded-lg border border-emerald-500/30 bg-background/80 px-3 py-2 text-[0.8125rem] leading-snug dark:border-emerald-500/35"
            role="status"
          >
            <p className="font-semibold text-foreground">Flow: quotation → PO → invoice</p>
            <ol className="mt-1.5 list-decimal space-y-1 pl-4 text-muted-foreground">
              <li>
                Below, choose a <strong className="text-foreground">PDF or image</strong> and click{" "}
                <strong className="text-foreground">Save PO</strong> — the PO links to this quotation.
              </li>
              <li>
                After saving, the quotation becomes <strong className="text-foreground">approved</strong> if it
                was not rejected.
              </li>
              <li>
                From the linked PO row, open <strong className="text-foreground">Invoice</strong> — a new invoice
                is created from this PO and quotation client/company snapshot (as many as you need per PO).
              </li>
            </ol>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {listError ? (
          <p className="text-destructive text-sm" role="alert">
            {listError}
          </p>
        ) : null}

        <div className="rounded-xl border-2 border-dashed border-emerald-500/40 bg-background/60 p-4 dark:bg-background/40">
          {quotationStatus === "rejected" ? (
            <p
              className="mb-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[0.8125rem] text-amber-950 dark:text-amber-100"
              role="note"
            >
              Quotation <strong className="font-medium">rejected</strong> — you can still save a PO; it will not
              auto-approve the quotation.
            </p>
          ) : null}
          <p className="mb-3 text-sm font-medium text-foreground">
            Attach a PDF or image, then click Save PO
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>PDF / image (required)</Label>
              <input
                key={fileKey}
                ref={fileInputRef}
                id="po-file"
                type="file"
                className="sr-only"
                accept=".pdf,application/pdf,image/png,image/jpeg,image/jpg,image/pjpeg,image/webp,.png,.jpg,.jpeg,.webp"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-emerald-500/30"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Choose file
                </Button>
                <span className="text-muted-foreground max-w-[min(100%,280px)] truncate text-xs">
                  {file ? file.name : "—"}
                </span>
              </div>
            </div>
          </div>
          {formError ? (
            <p className="mt-2 text-sm text-destructive" role="alert">
              {formError}
            </p>
          ) : null}
          {formOk ? (
            <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-400" role="status">
              {formOk} Open the PO below to create an invoice.
            </p>
          ) : null}
          <Button
            type="button"
            size="lg"
            className="mt-4 w-full gap-2 sm:w-auto"
            disabled={creating || !file}
            onClick={() => void createClientPo()}
          >
            <Upload className="size-4" aria-hidden />
            {creating ? "Saving…" : "Save PO"}
          </Button>
          <p className="text-muted-foreground mt-2 text-[0.75rem] leading-relaxed">
            You can also select a quotation and upload from the{" "}
            <Link href={`${pathPrefix}/purchase-orders`} className="text-primary underline-offset-2 hover:underline">
              Purchase Orders
            </Link>{" "}
            page.
          </p>
        </div>

        <div>
          <p className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-foreground">
            <FileText className="size-4 opacity-80" aria-hidden />
            Linked POs
          </p>
          {loading ? (
            <ul className="space-y-2 text-sm" aria-busy="true">
              {Array.from({ length: 4 }).map((_, i) => (
                <li
                  key={i}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 dark:bg-muted/10"
                >
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48 max-w-full" />
                  </div>
                  <Skeleton className="h-4 w-24" />
                  <div className="flex flex-wrap gap-2">
                    <Skeleton className="h-8 w-[4.75rem] rounded-md" />
                    <Skeleton className="h-8 w-[4.75rem] rounded-md" />
                  </div>
                </li>
              ))}
            </ul>
          ) : rows.length === 0 ? (
            <p className="text-muted-foreground text-sm">No POs yet — upload one above.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {rows.map((row) => (
                <li
                  key={row._id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 dark:bg-muted/10"
                >
                  <div className="min-w-0">
                    <span className="font-medium">{row.poNumber}</span>
                    {row.hasFile ? (
                      <span className="ml-2 text-[0.65rem] font-medium text-[#047857] dark:text-[#34d399]">
                        PDF / file ✓
                      </span>
                    ) : null}
                    <p className="text-muted-foreground text-[0.7rem]">Quotation: {quotationNumber}</p>
                  </div>
                  <span className="text-muted-foreground capitalize">
                    {row.type} · {row.status}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`${pathPrefix}/purchase-orders/${row._id}#po-invoices`}>Open PO</Link>
                    </Button>
                    <Button size="sm" className="gap-1" asChild>
                      <Link href={`${pathPrefix}/invoices/new?poId=${encodeURIComponent(row._id)}`}>
                        <FileSpreadsheet className="size-3.5" aria-hidden />
                        Invoice
                      </Link>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Button size="sm" variant="outline" asChild>
          <Link href={`${pathPrefix}/purchase-orders?projectId=${encodeURIComponent(projectId)}`}>
            All POs for this project
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
