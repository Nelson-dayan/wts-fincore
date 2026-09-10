"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DocumentCard } from "@/components/portals/admin-quotation-details/document-card";
import { InternalNotesCard } from "@/components/portals/admin-quotation-details/internal-notes-card";
import { LineItemsCard } from "@/components/portals/admin-quotation-details/line-items-card";
import { QuotationHeaderActions } from "@/components/portals/admin-quotation-details/quotation-header-actions";
import { QuotationStatusEditor } from "@/components/portals/admin-quotation-details/quotation-status-card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { QuotationInfoCard } from "@/components/portals/admin-quotation-details/quotation-info-card";
import { SnapshotsCard } from "@/components/portals/admin-quotation-details/snapshots-card";
import { SummaryCard } from "@/components/portals/admin-quotation-details/summary-card";
import { emptyLine, mapPagesFromApi } from "@/components/portals/admin-quotation-details/types";
import type { PageBlock, QuotationPayload } from "@/components/portals/admin-quotation-details/types";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { QuotationPurchaseOrdersSection } from "@/components/portals/quotation-purchase-orders-section";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { SaveSuccessToast } from "@/components/ui/save-success-toast";
import { readResponseJson } from "@/lib/http/read-response-json";
import { usePortalConfig } from "@/components/portals/portal-config-context";
import { useSaveFeedback } from "@/lib/hooks/use-save-feedback";

export function AdminQuotationDetailsClient({ quotationId }: { quotationId: string }) {
  const router = useRouter();
  const { apiPrefix, pathPrefix } = usePortalConfig();
  const [item, setItem] = useState<QuotationPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { successMessage, clearSaveFeedback, showSaveSuccess } = useSaveFeedback();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshSnapshots, setRefreshSnapshots] = useState(false);

  const [status, setStatus] = useState<QuotationPayload["status"]>("draft");
  const [currency, setCurrency] = useState("AED");
  const [quotationCode, setQuotationCode] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [docDate, setDocDate] = useState("");
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [taxRate, setTaxRate] = useState("0");
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [pages, setPages] = useState<PageBlock[]>([{ pageNumber: 1, items: [emptyLine(1)] }]);
  const [leadTime, setLeadTime] = useState("");
  const [terms, setTerms] = useState("");
  const [validity, setValidity] = useState("");
  const [remainingText, setRemainingText] = useState("");
  const [remainingAmount, setRemainingAmount] = useState("");
  const [confirmDate, setConfirmDate] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
    const response = await fetch(`${apiPrefix}/quotations/${quotationId}`, {
      cache: "no-store",
    });
    const json = await readResponseJson<{
      success?: boolean;
      data?: { item?: QuotationPayload };
      error?: { message?: string };
    }>(response);
    if (!response.ok) throw new Error(json.error?.message ?? "Failed to load quotation");
    const q = json.data?.item;
    if (!q) throw new Error("Missing quotation");
    setItem(q);
    setStatus(q.status);
    setCurrency(q.currency || "AED");
    setQuotationCode(
      String(q.documentInfo.quotationCode ?? q.documentInfo.geCode ?? "").trim()
    );
    setDocDate(q.documentInfo.date ? new Date(q.documentInfo.date).toISOString().slice(0, 10) : "");
    setSubject(q.documentInfo.subject ?? "");
    setTitle(q.documentInfo.title ?? "");
    setDescription(q.documentInfo.description ?? "");
    setTaxRate(String(q.documentInfo.taxRate ?? 0));
    setTaxEnabled(Boolean(q.documentInfo.taxEnabled));
    setPages(mapPagesFromApi(q.pages));
    setLeadTime(q.quotationInfo.leadTime ?? "");
    setTerms(q.quotationInfo.terms ?? "");
    setValidity(q.quotationInfo.validity ?? "");
    setRemainingText(q.quotationInfo.remainingText ?? "");
    setRemainingAmount(
      q.quotationInfo.remainingAmount !== undefined
        ? String(q.quotationInfo.remainingAmount)
        : ""
    );
    setConfirmDate(
      q.quotationInfo.confirmDate
        ? new Date(q.quotationInfo.confirmDate).toISOString().slice(0, 10)
        : ""
    );
    setInternalNotes(q.internalNotes ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load quotation");
      setItem(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [quotationId, apiPrefix]);

  function addPage() {
    setPages((prev) => {
      const nextNum = Math.max(0, ...prev.map((p) => p.pageNumber)) + 1;
      return [...prev, { pageNumber: nextNum, items: [emptyLine(1)] }];
    });
  }

  function addLine(pageIdx: number) {
    setPages((prev) => {
      const copy = prev.map((p) => ({ ...p, items: [...p.items] }));
      const block = copy[pageIdx];
      if (!block) return prev;
      const nextNo = Math.max(0, ...block.items.map((i) => i.number)) + 1;
      block.items.push(emptyLine(nextNo));
      return copy;
    });
  }

  function removeLine(pageIdx: number, lineIdx: number) {
    setPages((prev) => {
      const copy = prev.map((p) => ({ ...p, items: [...p.items] }));
      const block = copy[pageIdx];
      if (!block || block.items.length <= 1) return prev;
      block.items.splice(lineIdx, 1);
      return copy;
    });
  }

  function updateLineField(
    pageIdx: number,
    lineIdx: number,
    field: "number" | "name" | "quantity" | "price",
    value: number | string
  ) {
    setPages((prev) => {
      const copy = prev.map((p) => ({
        ...p,
        items: p.items.map((row) => ({ ...row })),
      }));
      const line = copy[pageIdx]?.items[lineIdx];
      if (!line) return prev;
      if (field === "name") {
        line.name = String(value);
      } else if (field === "number") {
        line.number = Number(value);
      } else if (field === "quantity") {
        line.quantity = Number(value);
      } else {
        line.price = Number(value);
      }
      return copy;
    });
  }

  async function save(): Promise<boolean> {
    setSaving(true);
    setError("");
    clearSaveFeedback();
    try {
      const payloadPages = pages.map((p) => ({
        pageNumber: p.pageNumber,
        items: p.items.map((row) => ({
          number: row.number,
          name: row.name.trim(),
          displayName: row.displayName.trim(),
          description: row.description.trim(),
          quantity: Number(row.quantity) || 0,
          price: Number(row.price) || 0,
          length: row.length === "" ? undefined : Number(row.length),
          width: row.width === "" ? undefined : Number(row.width),
        })),
      }));

      const response = await fetch(`${apiPrefix}/quotations/${quotationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refreshSnapshots,
          documentInfo: {
            quotationCode,
            date: new Date(docDate).toISOString(),
            subject,
            title,
            description,
            taxRate: Number(taxRate || 0),
            taxEnabled,
          },
          pages: payloadPages,
          quotationInfo: {
            leadTime,
            terms,
            validity,
            remainingText,
            remainingAmount: remainingAmount === "" ? undefined : Number(remainingAmount),
            confirmDate: confirmDate === "" ? undefined : confirmDate,
          },
          status,
          currency,
          internalNotes,
        }),
      });
      const json = await readResponseJson<{ success?: boolean; error?: { message?: string } }>(response);
      if (!response.ok) {
        throw new Error(json.error?.message ?? `Failed to save (HTTP ${response.status}).`);
      }
      setEditing(false);
      setRefreshSnapshots(false);
      await load();
      showSaveSuccess();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function remove(): Promise<boolean> {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`${apiPrefix}/quotations/${quotationId}`, {
        method: "DELETE",
      });
      const json = await readResponseJson<{ success?: boolean; error?: { message?: string } }>(response);
      if (!response.ok) throw new Error(json.error?.message ?? "Failed to delete");
      if (!item) throw new Error("Missing quotation");
      const pid = item.projectId?.trim();
      router.replace(
        pid
          ? `${pathPrefix}/quotations?projectId=${encodeURIComponent(pid)}`
          : `${pathPrefix}/quotations`
      );
      router.refresh();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
      return false;
    } finally {
      setSaving(false);
    }
  }

  if (loading && !error) {
    return (
      <div className="animate-fade-in space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64 max-w-full" />
          <Skeleton className="h-4 w-full max-w-2xl" />
        </div>
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <DashboardPageHeader
        title={item ? `Quotation ${item.quotationNumber}` : "Quotation"}
        description="When the client PO arrives, upload it in the green section below. Edit the rest of the quotation here."
      />
      <SaveSuccessToast message={successMessage} />
      {error ? (
        <div className="mb-4 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}
      {editing ? (
        <div className="sticky top-3 z-20 mb-4 rounded-xl border border-border/70 bg-background/95 p-3 shadow-sm backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">Editing mode active</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => void save()} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditing(false);
                  setRefreshSnapshots(false);
                  load().catch(() => {});
                }}
                disabled={saving}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete this quotation?"
        description="This cannot be undone. Delete is blocked if purchase orders are linked."
        confirmLabel="Delete"
        variant="destructive"
        loading={saving}
        onConfirm={async () => {
          const ok = await remove();
          if (ok) setDeleteConfirmOpen(false);
        }}
      />

      {item ? (
        <>
          <QuotationHeaderActions quotationId={quotationId} projectId={item.projectId} />

          <QuotationStatusEditor
            quotationId={quotationId}
            currentStatus={item.status}
            onUpdated={() => load()}
            variant="banner"
          />

          <QuotationPurchaseOrdersSection
            quotationId={item._id}
            projectId={item.projectId}
            quotationStatus={item.status}
            quotationNumber={item.quotationNumber}
          />

          <SummaryCard
            item={item}
            editing={editing}
            saving={saving}
            onSave={() => void save()}
            onCancel={() => {
              setEditing(false);
              setRefreshSnapshots(false);
              load().catch(() => {});
            }}
            onStartEdit={() => setEditing(true)}
            onDelete={() => setDeleteConfirmOpen(true)}
          />

          <InternalNotesCard
            projectId={item.projectId}
            editing={editing}
            internalNotes={internalNotes}
            onInternalNotesChange={setInternalNotes}
          />

          <SnapshotsCard item={item} />

          {editing ? (
            <div className="mb-4 flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={refreshSnapshots}
                  onChange={(e) => setRefreshSnapshots(e.target.checked)}
                />
                Refresh client & company snapshots from current project
              </label>
            </div>
          ) : null}

          <DocumentCard
            editing={editing}
            status={status}
            docDate={docDate}
            quotationCode={quotationCode}
            subject={subject}
            title={title}
            description={description}
            taxRate={taxRate}
            taxEnabled={taxEnabled}
            currency={currency}
            onStatusChange={setStatus}
            onDocDateChange={setDocDate}
            onQuotationCodeChange={setQuotationCode}
            onSubjectChange={setSubject}
            onTitleChange={setTitle}
            onDescriptionChange={setDescription}
            onTaxRateChange={setTaxRate}
            onTaxEnabledChange={setTaxEnabled}
            onCurrencyChange={setCurrency}
          />

          <LineItemsCard
            editing={editing}
            pages={pages}
            readonlyPages={item.pages}
            onAddPage={addPage}
            onAddLine={addLine}
            onRemoveLine={removeLine}
            onFieldChange={updateLineField}
          />

          <QuotationInfoCard
            editing={editing}
            leadTime={leadTime}
            validity={validity}
            terms={terms}
            remainingAmount={remainingAmount}
            confirmDate={confirmDate}
            remainingText={remainingText}
            onLeadTimeChange={setLeadTime}
            onValidityChange={setValidity}
            onTermsChange={setTerms}
            onRemainingAmountChange={setRemainingAmount}
            onConfirmDateChange={setConfirmDate}
            onRemainingTextChange={setRemainingText}
          />
        </>
      ) : null}
    </div>
  );
}
