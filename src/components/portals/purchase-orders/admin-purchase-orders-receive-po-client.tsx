"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dropdown } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectSearchPicker } from "@/components/portals/project-search-picker";
import { apiFetch } from "@/lib/api/client";
import { usePortalConfig } from "@/components/portals/portal-config-context";

type QRow = {
  _id: string;
  quotationNumber: string;
  status: string;
  projectId: string;
  projectName?: string;
};

const MAX_PO_UPLOAD_BYTES = 9 * 1024 * 1024;

export function AdminPurchaseOrdersReceivePoClient({
  projectId,
  onPoSaved,
}: {
  projectId: string;
  /** Called after a PO is saved so sibling lists (e.g. PO table) can refetch immediately. */
  onPoSaved?: () => void;
}) {
  const { apiPrefix, pathPrefix } = usePortalConfig();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileKey, setFileKey] = useState(0);
  const [quotations, setQuotations] = useState<QRow[]>([]);
  const [loadingQ, setLoadingQ] = useState(false);
  const [qError, setQError] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState(projectId || "");
  const [quotationId, setQuotationId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const loadQuotations = useCallback(async () => {
    setQError("");
    if (!selectedProjectId) {
      setQuotations([]);
      setLoadingQ(false);
      return;
    }
    setLoadingQ(true);
    try {
      const qs = new URLSearchParams({ page: "1", limit: "60", q: "" });
      qs.set("projectId", selectedProjectId);
      const payload = await apiFetch<{ items?: QRow[] }>(`${apiPrefix}/quotations?${qs}`);
      const list = payload.items ?? [];
      setQuotations(list);
      setQuotationId((prev) => {
        if (prev && list.some((q) => q._id === prev)) return prev;
        const firstNonRejected = list.find((r) => r.status !== "rejected") ?? list[0];
        return firstNonRejected?._id ?? "";
      });
    } catch (e) {
      setQError(e instanceof Error ? e.message : "Quotations load failed");
      setQuotations([]);
    } finally {
      setLoadingQ(false);
    }
  }, [apiPrefix, selectedProjectId]);

  useEffect(() => {
    loadQuotations().catch(() => {});
  }, [loadQuotations]);

  async function submit() {
    setErr("");
    setMsg("");
    if (!quotationId) {
      setErr("Choose a quotation.");
      return;
    }
    if (!file) {
      setErr("Attach a PDF or image first.");
      return;
    }
    if (file && file.size > MAX_PO_UPLOAD_BYTES) {
      setErr("File bahut badi hai — ~9 MB se chhoti file chunna.");
      return;
    }
    setSubmitting(true);
    try {
      const data = await apiFetch<{ poNumber?: string }>(`${apiPrefix}/purchase-orders`, {
        method: "POST",
        body: (() => {
          const fd = new FormData();
          fd.set("quotationId", quotationId);
          fd.set("type", "client");
          fd.set("file", file);
          return fd;
        })(),
      });
      setMsg(`Saved: ${data.poNumber ?? ""}`);
      setFile(null);
      setFileKey((k) => k + 1);
      onPoSaved?.();
      router.refresh();
      loadQuotations().catch(() => {});
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save PO");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card
      id="admin-po-upload"
      className="scroll-mt-28 mb-8 border-2 border-emerald-500/50 bg-emerald-500/6 shadow-md shadow-emerald-500/10 dark:border-emerald-500/45 dark:bg-emerald-500/10"
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold tracking-tight inline-flex items-center gap-2">
          <Upload className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
          Add PO
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!projectId && (
          <div className="space-y-2 max-w-md pb-2 border-b border-border/40 mb-2">
            <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              1. Find Project / Client
            </label>
            <ProjectSearchPicker 
              id="po-project-search" 
              value={selectedProjectId} 
              onChange={(id) => setSelectedProjectId(id)} 
              helperText="Search project or client name to find related Quotations."
            />
          </div>
        )}

        {loadingQ ? (
          <div className="space-y-2.5">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : qError ? (
          <p className="text-destructive text-sm">{qError}</p>
        ) : !selectedProjectId ? (
          <p className="text-muted-foreground text-sm flex items-center gap-2 bg-muted/20 p-3 rounded-lg border border-dashed">
            Please select a project above to see its quotations.
          </p>
        ) : quotations.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No quotations.{" "}
            <Link href={`${pathPrefix}/quotations`} className="text-primary underline-offset-4 hover:underline">
              Create one
            </Link>
            .
          </p>
        ) : (
          <div className="rounded-xl border border-emerald-500/35 bg-background/75 p-4 shadow-sm dark:bg-background/40">
            <p className="mb-3 text-xs font-medium text-muted-foreground">
              Select quotation, attach file, then save the PO.
            </p>
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,0.72fr)_auto] md:items-end">
              <div className="space-y-1.5">
                <label
                  htmlFor="recv-q"
                  className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
                >
                  Quotation
                </label>
                <Dropdown
                  id="recv-q"
                  value={quotationId}
                  onChange={(e) => setQuotationId(e.target.value)}
                  className="min-w-50"
                  options={quotations.map((q) => ({
                    value: q._id,
                    label: `${q.quotationNumber} · ${q.status}${q.projectName ? ` · ${q.projectName}` : ""}`,
                  }))}
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="recv-file"
                  className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
                >
                  Upload PDF / image
                </label>
                {/*
                  Styled <input type="file"> often fails to open the OS picker on Windows/Edge.
                  Hidden input + button calling .click() is reliable.
                */}
                <input
                  key={fileKey}
                  ref={fileInputRef}
                  id="recv-file"
                  type="file"
                  className="sr-only"
                  accept=".pdf,application/pdf,image/png,image/jpeg,image/jpg,image/pjpeg,image/webp,.png,.jpg,.jpeg,.webp"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                <div>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-center"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Choose file
                  </Button>
                </div>
              </div>

              <Button
                type="button"
                disabled={submitting || !quotationId || !file}
                className="gap-1.5 whitespace-nowrap"
                onClick={() => void submit()}
              >
                <Upload className="size-3.5" aria-hidden />
                {submitting ? "Saving…" : "Save PO"}
              </Button>
            </div>
            <p className="truncate text-[11px] text-muted-foreground" title={file?.name ?? undefined}>
              {file ? `Selected file: ${file.name}` : "No file selected"}
            </p>
          </div>
        )}

        {err ? (
          <p className="text-destructive text-sm" role="alert">
            {err}
          </p>
        ) : null}
        {msg ? (
          <p className="text-sm text-emerald-700 dark:text-emerald-400" role="status">
            {msg}
          </p>
        ) : null}

      </CardContent>
    </Card>
  );
}
