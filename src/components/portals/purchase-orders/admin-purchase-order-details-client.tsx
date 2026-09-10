"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { PurchaseOrderInvoicesSection } from "@/components/portals/purchase-order-invoices-section";
import { PurchaseOrderFilePreview } from "@/components/portals/purchase-order-file-preview";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dropdown } from "@/components/ui/select";
import { readResponseJson } from "@/lib/http/read-response-json";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SaveSuccessToast } from "@/components/ui/save-success-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils/cn";
import { usePortalConfig } from "@/components/portals/portal-config-context";
import { useSaveFeedback } from "@/lib/hooks/use-save-feedback";

type PoPayload = {
  _id: string;
  poNumber: string;
  projectId: string;
  quotationId: string;
  quotationNumber?: string;
  type: string;
  status: string;
  fileUrl: string;
  externalPoNumber?: string;
  currency?: string;
  totalAmount?: number | null;
  createdAt: string;
};

const MAX_PO_UPLOAD_BYTES = 9 * 1024 * 1024;

export function AdminPurchaseOrderDetailsClient({ purchaseOrderId }: { purchaseOrderId: string }) {
  const router = useRouter();
  const { apiPrefix, pathPrefix } = usePortalConfig();
  const { successMessage, clearSaveFeedback, showSaveSuccess } = useSaveFeedback();
  const [item, setItem] = useState<PoPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [status, setStatus] = useState<string>("linked");
  const [externalPoNumber, setExternalPoNumber] = useState("");
  const [totalAmountStr, setTotalAmountStr] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saveMsg, setSaveMsg] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${apiPrefix}/purchase-orders/${purchaseOrderId}`, { cache: "no-store" });
      const data = await readResponseJson<{ item?: PoPayload; message?: string }>(res);
      if (!res.ok) throw new Error(data.message ?? "Failed to load");
      const po = data.item;
      if (!po) throw new Error("Missing purchase order");
      setItem(po);
      setStatus(po.status ?? "linked");
      setExternalPoNumber(String(po.externalPoNumber ?? "").trim());
      setTotalAmountStr(
        po.totalAmount != null &&
          typeof po.totalAmount === "number" &&
          Number.isFinite(po.totalAmount)
          ? String(po.totalAmount)
          : ""
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setItem(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch(() => {});
  }, [purchaseOrderId, apiPrefix]);

  async function save(): Promise<boolean> {
    if (!item) return false;
    setSaving(true);
    clearSaveFeedback();
    setSaveMsg("");
    try {
      if (item.type === "client") {
        if (file && file.size > MAX_PO_UPLOAD_BYTES) {
          throw new Error("File bahut badi hai — ~9 MB se chhoti file chunna.");
        }
        const fd = new FormData();
        fd.set("status", status);
        fd.set("externalPoNumber", externalPoNumber);
        if (totalAmountStr.trim() !== "") fd.set("totalAmount", totalAmountStr.trim());
        if (file) fd.set("file", file);
        const res = await fetch(`${apiPrefix}/purchase-orders/${purchaseOrderId}`, {
          method: "PATCH",
          body: fd,
        });
        const data = await readResponseJson<{ message?: string }>(res);
        if (!res.ok) throw new Error(data.message ?? "Save failed");
      } else {
        const payload: {
          status: string;
          externalPoNumber: string;
          totalAmount?: number;
        } = {
          status,
          externalPoNumber,
        };
        if (totalAmountStr.trim() !== "") {
          const n = Number.parseFloat(totalAmountStr.trim().replace(/,/g, ""));
          if (Number.isFinite(n)) payload.totalAmount = n;
        }
        const res = await fetch(`${apiPrefix}/purchase-orders/${purchaseOrderId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await readResponseJson<{ message?: string }>(res);
        if (!res.ok) throw new Error(data.message ?? "Save failed");
      }
      setFile(null);
      await load();
      showSaveSuccess();
      return true;
    } catch (e) {
      setSaveMsg(e instanceof Error ? e.message : "Save failed");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function deletePo(): Promise<boolean> {
    if (!item) return false;
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch(`${apiPrefix}/purchase-orders/${purchaseOrderId}`, {
        method: "DELETE",
      });
      const data = await readResponseJson<{ message?: string }>(res);
      if (!res.ok) throw new Error(data.message ?? "Could not delete purchase order");
      const back = item.projectId.trim()
        ? `${pathPrefix}/purchase-orders?projectId=${encodeURIComponent(item.projectId)}`
        : `${pathPrefix}/purchase-orders`;
      router.push(back);
      return true;
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Could not delete purchase order");
      setDeleting(false);
      return false;
    }
  }

  if (loading && !error) {
    return (
      <div className="animate-fade-in space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-72 max-w-full" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </div>
        <Skeleton className="h-36 w-full rounded-xl" />
        <Skeleton className="h-52 w-full rounded-xl" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="min-h-[14rem] rounded-xl" />
          <Skeleton className="min-h-[14rem] rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <SaveSuccessToast message={successMessage} />
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete this purchase order?"
        description={
          item
            ? `Permanently remove ${item.poNumber}? This cannot be undone if the server allows deletion.`
            : "Permanently remove this purchase order?"
        }
        confirmLabel="Delete"
        variant="destructive"
        loading={deleting}
        onConfirm={async () => {
          const ok = await deletePo();
          if (ok) setDeleteConfirmOpen(false);
        }}
      />
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

          <div className="sticky top-0 z-50 -mx-4 mb-4 flex flex-wrap items-center gap-2 border-b border-border/80 bg-background/95 px-4 py-3 backdrop-blur supports-backdrop-filter:bg-background/80 sm:-mx-8 sm:px-8">
            <Button size="sm" onClick={() => void save()} disabled={saving}>
              {saving ? "Saving…" : "Save PO"}
            </Button>
            <Link href={`${pathPrefix}/quotations/${item.quotationId}`}>
              <Button size="sm" variant="outline">
                Open quotation
                {item.quotationNumber ? ` (${item.quotationNumber})` : ""}
              </Button>
            </Link>
            <Link href={`${pathPrefix}/projects/${item.projectId}`}>
              <Button size="sm" variant="outline">
                Open project
              </Button>
            </Link>
            <Link href={`${pathPrefix}/purchase-orders`}>
              <Button size="sm" variant="outline">
                All POs
              </Button>
            </Link>
            {pathPrefix === "/admin" ? (
            <Button
              type="button"
              size="sm"
              variant="destructive"
              className="gap-1.5 ml-auto"
              disabled={deleting}
              onClick={() => setDeleteConfirmOpen(true)}
            >
              <Trash2 className="size-3.5" aria-hidden />
              {deleting ? "Deleting…" : "Delete PO"}
            </Button>
            ) : null}
          </div>
          {deleteError ? (
            <p className="text-destructive mb-4 text-sm" role="alert">
              {deleteError}
            </p>
          ) : null}
          {saveMsg ? (
            <p
              className={cn("mb-4 text-sm text-destructive")}
              role="status"
            >
              {saveMsg}
            </p>
          ) : null}

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
              {item.externalPoNumber ? (
                <p className="sm:col-span-2">
                  <strong>Client / external PO #:</strong> {item.externalPoNumber}
                </p>
              ) : null}
              {item.totalAmount != null && Number.isFinite(Number(item.totalAmount)) ? (
                <p className="sm:col-span-2">
                  <strong>PO amount:</strong>{" "}
                  <span className="tabular-nums">
                    {item.currency ?? "AED"}{" "}
                    {Number(item.totalAmount).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-base">
                {item.type === "client" ? "Edit PO & replace file" : "Edit PO"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {item.type !== "client" ? (
                <p className="text-muted-foreground text-sm">
                  Internal PO — no file attachment; status and reference fields still save to the database.
                </p>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="po-st">Status</Label>
                  <Dropdown
                    id="po-st"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="h-10 rounded-lg border-input/90 bg-background text-sm"
                    options={[
                      { value: "linked", label: "linked" },
                      { value: "active", label: "active" },
                      { value: "completed", label: "completed" },
                    ]}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="po-ext">Client / external PO # (optional)</Label>
                  <Input
                    id="po-ext"
                    value={externalPoNumber}
                    onChange={(e) => setExternalPoNumber(e.target.value)}
                    placeholder="e.g. PO-CLIENT-1042"
                    className="h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="po-amt">PO total amount — {item?.currency ?? "AED"} (optional)</Label>
                  <Input
                    id="po-amt"
                    inputMode="decimal"
                    value={totalAmountStr}
                    onChange={(e) => setTotalAmountStr(e.target.value)}
                    placeholder="0.00"
                    className="h-10 tabular-nums"
                  />
                </div>
                {item.type === "client" ? (
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
                ) : null}
              </div>
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
