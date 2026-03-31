"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { PurchaseOrderInvoicesSection } from "@/components/portals/purchase-order-invoices-section";
import { PurchaseOrderFilePreview } from "@/components/portals/purchase-order-file-preview";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

type PoPayload = {
  _id: string;
  poNumber: string;
  projectId: string;
  quotationId: string;
  quotationNumber?: string;
  type: string;
  status: string;
  fileUrl: string;
  createdAt: string;
};

const MAX_PO_UPLOAD_BYTES = 9 * 1024 * 1024;

export function AdminPurchaseOrderDetailsClient({ purchaseOrderId }: { purchaseOrderId: string }) {
  const [item, setItem] = useState<PoPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string>("linked");
  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saveMsg, setSaveMsg] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/purchase-orders/${purchaseOrderId}`, { cache: "no-store" });
      const data = (await res.json()) as { item?: PoPayload; message?: string };
      if (!res.ok) throw new Error(data.message ?? "Failed to load");
      const po = data.item;
      if (!po) throw new Error("Missing purchase order");
      setItem(po);
      setStatus(po.status ?? "linked");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setItem(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch(() => {});
  }, [purchaseOrderId]);

  async function save() {
    if (!item) return;
    setSaving(true);
    setSaveMsg("");
    try {
      if (item.type === "client" && file) {
        if (file.size > MAX_PO_UPLOAD_BYTES) {
          throw new Error("File bahut badi hai — ~9 MB se chhoti file chunna.");
        }
        const fd = new FormData();
        fd.set("status", status);
        fd.set("file", file);
        const res = await fetch(`/api/admin/purchase-orders/${purchaseOrderId}`, {
          method: "PATCH",
          body: fd,
        });
        const data = (await res.json()) as { message?: string };
        if (!res.ok) throw new Error(data.message ?? "Save failed");
      } else {
        const res = await fetch(`/api/admin/purchase-orders/${purchaseOrderId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status,
          }),
        });
        const data = (await res.json()) as { message?: string };
        if (!res.ok) throw new Error(data.message ?? "Save failed");
      }
      setSaveMsg("Saved.");
      setFile(null);
      await load();
    } catch (e) {
      setSaveMsg(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading && !error) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  return (
    <div className="animate-fade-in">
      <DashboardPageHeader
        title={item ? `Purchase order ${item.poNumber}` : "Purchase order"}
        description={
          item?.quotationNumber
            ? `This PO is permanently linked to quotation ${item.quotationNumber}. You can attach the document later as well.`
            : "This PO is linked to a quotation. The link is saved first; upload or replace the document below."
        }
      />
      {error ? (
        <div className="mb-4 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {item ? (
        <>
          <PurchaseOrderInvoicesSection purchaseOrderId={item._id} poNumber={item.poNumber} />

          <div
            className="mb-4 rounded-xl border-2 border-primary/30 bg-primary/6 px-4 py-3 dark:border-primary/40 dark:bg-primary/12"
            role="region"
            aria-label="Linked quotation"
          >
            <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-primary">
              Purchase order for this quotation
            </p>
            <p className="mt-1 text-base font-semibold text-foreground">
              {item.quotationNumber ? (
                <>
                  Quotation{" "}
                  <span className="font-mono tracking-tight">{item.quotationNumber}</span>
                </>
              ) : (
                "Quotation (number unavailable)"
              )}
            </p>
            <p className="text-muted-foreground mt-1 text-sm">
              PO #{item.poNumber} is tied to this quotation — the same reference appears on list and detail views.
            </p>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            <Link href={`/admin/quotations/${item.quotationId}`}>
              <Button size="sm" variant="outline">
                Open quotation
                {item.quotationNumber ? ` (${item.quotationNumber})` : ""}
              </Button>
            </Link>
            <Link href={`/admin/projects/${item.projectId}`}>
              <Button size="sm" variant="outline">
                Open project
              </Button>
            </Link>
            <Link href="/admin/purchase-orders">
              <Button size="sm" variant="outline">
                All purchase orders
              </Button>
            </Link>
          </div>

          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-base">Summary</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
              <p>
                <strong>PO #:</strong> {item.poNumber}
              </p>
              <p>
                <strong>Type:</strong> <span className="capitalize">{item.type}</span>
              </p>
              <p>
                <strong>Status:</strong> <span className="capitalize">{item.status}</span>
              </p>
              <p>
                <strong>Created:</strong> {new Date(item.createdAt).toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-base">Edit & replace file</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {item.type !== "client" ? (
                <p className="text-muted-foreground text-sm">
                  This is an internal PO generated from a quotation. Files are not stored here.
                </p>
              ) : (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="po-st">Status</Label>
                      <select
                        id="po-st"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="flex h-10 w-full rounded-lg border border-input/90 bg-background px-3 text-sm"
                      >
                        <option value="linked">linked</option>
                        <option value="active">active</option>
                        <option value="completed">completed</option>
                      </select>
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label>Replace file (optional)</Label>
                      <input
                        key={fileKey}
                        ref={fileInputRef}
                        id="po-replace"
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
                          onClick={() => fileInputRef.current?.click()}
                        >
                          Choose file
                        </Button>
                        <span className="text-muted-foreground max-w-50 truncate text-xs">
                          {file ? file.name : "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button type="button" onClick={() => void save()} disabled={saving}>
                    {saving ? "Saving…" : "Save changes"}
                  </Button>
                  {saveMsg ? (
                    <p
                      className={
                        saveMsg === "Saved." ? "text-sm text-primary" : "text-sm text-destructive"
                      }
                      role="status"
                    >
                      {saveMsg}
                    </p>
                  ) : null}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Document preview</CardTitle>
            </CardHeader>
            <CardContent>
              {item.type === "client" ? <PurchaseOrderFilePreview fileUrl={item.fileUrl} /> : null}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
