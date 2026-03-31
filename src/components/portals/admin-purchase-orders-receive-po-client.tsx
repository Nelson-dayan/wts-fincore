"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type QRow = {
  _id: string;
  quotationNumber: string;
  status: string;
  projectId: string;
  projectName?: string;
};

const MAX_PO_UPLOAD_BYTES = 9 * 1024 * 1024;

export function AdminPurchaseOrdersReceivePoClient({ projectId }: { projectId: string }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileKey, setFileKey] = useState(0);
  const [quotations, setQuotations] = useState<QRow[]>([]);
  const [loadingQ, setLoadingQ] = useState(true);
  const [qError, setQError] = useState("");
  const [quotationId, setQuotationId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const loadQuotations = useCallback(async () => {
    setLoadingQ(true);
    setQError("");
    try {
      const qs = new URLSearchParams({ page: "1", limit: "60", q: "" });
      if (projectId) qs.set("projectId", projectId);
      const res = await fetch(`/api/admin/quotations?${qs}`, { cache: "no-store" });
      const data = (await res.json()) as { items?: QRow[]; message?: string };
      if (!res.ok) throw new Error(data.message ?? "Quotations load failed");
      const list = data.items ?? [];
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
  }, [projectId]);

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
      const res = await fetch("/api/admin/purchase-orders", {
        method: "POST",
        body: (() => {
          const fd = new FormData();
          fd.set("quotationId", quotationId);
          fd.set("type", "client");
          fd.set("file", file);
          return fd;
        })(),
      });
      const rawText = await res.text();
      let data: { message?: string; id?: string; poNumber?: string } = {};
      try {
        data = rawText ? (JSON.parse(rawText) as typeof data) : {};
      } catch {
        throw new Error(
          res.status === 413
            ? "File exceeds server limit — try a smaller PDF (~4–8 MB)."
            : `Could not read server response (${res.status}). Try again.`
        );
      }
      if (!res.ok) throw new Error(data.message ?? "Could not save PO");
      setMsg(`Saved: ${data.poNumber ?? ""}`);
      setFile(null);
      setFileKey((k) => k + 1);
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
        {loadingQ ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : qError ? (
          <p className="text-destructive text-sm">{qError}</p>
        ) : quotations.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No quotations.{" "}
            <Link href="/admin/quotations" className="text-primary underline-offset-4 hover:underline">
              Create one
            </Link>
            .
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-emerald-500/35 bg-background/70 shadow-sm dark:bg-background/40">
            <table className="w-full min-w-160 text-left text-sm">
              <caption className="sr-only">
                New purchase order: select quotation, upload PDF, save
              </caption>
              <thead>
                <tr className="border-b border-border/80 bg-muted/45 text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground dark:bg-muted/25">
                  <th scope="col" className="px-3 py-3 text-foreground">
                    Quotation
                  </th>
                  <th scope="col" className="px-3 py-3 text-foreground min-w-50">
                    Upload PDF / image
                  </th>
                  <th scope="col" className="px-3 py-3 text-right text-foreground w-32">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="align-middle border-b border-border/50">
                  <td className="px-3 py-3">
                    <label htmlFor="recv-q" className="sr-only">
                      Kaun si quotation
                    </label>
                    <select
                      id="recv-q"
                      value={quotationId}
                      onChange={(e) => setQuotationId(e.target.value)}
                      className="flex h-10 w-full min-w-50 rounded-lg border border-input/90 bg-background px-3 text-sm"
                    >
                      {quotations.map((q) => (
                        <option key={q._id} value={q._id}>
                          {q.quotationNumber} · {q.status}
                          {q.projectName ? ` · ${q.projectName}` : ""}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-3">
                    {/*
                      Styled &lt;input type="file"&gt; often fails to open the OS picker on Windows/Edge.
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
                    <div className="flex max-w-60 flex-col gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full justify-center"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Choose file
                      </Button>
                      <p
                        className="text-muted-foreground truncate text-[0.7rem] leading-tight"
                        title={file?.name ?? undefined}
                      >
                        {file ? file.name : "No file selected"}
                      </p>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <Button
                      type="button"
                      size="sm"
                      disabled={submitting || !quotationId || !file}
                      className="gap-1.5 whitespace-nowrap"
                      onClick={() => void submit()}
                    >
                      <Upload className="size-3.5" aria-hidden />
                      {submitting ? "…" : "Save PO"}
                    </Button>
                  </td>
                </tr>
              </tbody>
            </table>
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
