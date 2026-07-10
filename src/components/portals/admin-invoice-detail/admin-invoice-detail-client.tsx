"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { EditorPanel } from "@/components/portals/admin-invoice-detail/editor-panel";
import { InvoicePrintStyle } from "@/components/portals/admin-invoice-detail/print-style";
import type { Bank, Item } from "@/components/portals/admin-invoice-detail/types";
import { readImageFileAsDataUrl } from "@/components/portals/admin-invoice-detail/utils";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { InvoiceSecDocument, type InvoiceDocData } from "@/components/invoices/invoice-sec-document";
import { aedAmountInWords } from "@/lib/invoice/aed-amount-words";
import { computeInvoiceTotals } from "@/lib/invoice/invoice-totals";
import { exportInvoicePdf } from "@/utils/exportPdf";
import { apiFetch } from "@/lib/api/client";
import { Skeleton } from "@/components/ui/skeleton";
import { SaveSuccessToast } from "@/components/ui/save-success-toast";
import { usePortalConfig } from "@/components/portals/portal-config-context";
import { useSaveFeedback } from "@/lib/hooks/use-save-feedback";
import { SaveConfirmModal } from "@/components/ui/save-confirm-modal";
import { ApplyCreditModal } from "@/components/portals/admin-invoice-detail/apply-credit-modal";


function toDocData(item: Item): InvoiceDocData {
  const extras = item.extras as InvoiceDocData["extras"];
  return {
    invoiceNumber: item.invoiceNumber,
    invoiceType: item.invoiceType ?? "aed",
    currency: item.currency,
    documentInfo: item.documentInfo,
    clientSnapshot: item.clientSnapshot,
    companySnapshot: item.companySnapshot,
    pages: item.pages,
    totals: item.totals,
    extras: extras ?? {},
    dueDate: item.dueDate,
    poId: item.poId,
  };
}

function parsePaymentTermsDays(terms: string): number | null {
  if (!terms) return null;
  const normalized = terms.toLowerCase().trim();
  if (normalized.includes("receipt") || normalized.includes("immediate")) {
    return 0;
  }
  const match = normalized.match(/(\d+)\s*day/);
  if (match) {
    return parseInt(match[1], 10);
  }
  const rawNum = parseInt(normalized, 10);
  if (!isNaN(rawNum) && String(rawNum) === normalized) {
    return rawNum;
  }
  return null;
}


export function AdminInvoiceDetailClient({
  invoiceId,
  poId,
  invoiceType = "aed",
  poInvoiceCount,
}: {
  invoiceId?: string;
  poId?: string;
  invoiceType?: "aed" | "usd";
  poInvoiceCount?: number;
}) {
  const router = useRouter();
  const { apiPrefix, pathPrefix } = usePortalConfig();
  const { successMessage, clearSaveFeedback, showSaveSuccess } = useSaveFeedback();
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [pdfExporting, setPdfExporting] = useState(false);
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [creditBalance, setCreditBalance] = useState<number>(0);
  const [creditPayments, setCreditPayments] = useState<any[]>([]);
  const [creditModalOpen, setCreditModalOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const endpoint = invoiceId
          ? `${apiPrefix}/invoices/${invoiceId}?_t=${Date.now()}`
          : `${apiPrefix}/invoices/template?poId=${encodeURIComponent(
              String(poId ?? "")
          )}&invoiceType=${encodeURIComponent(invoiceType)}&_t=${Date.now()}`;
      const data = await apiFetch<{ item?: Item }>(endpoint);
      if (!data.item) throw new Error("Missing invoice");
      setItem(data.item as Item);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setItem(null);
    } finally {
      setLoading(false);
    }
  }, [invoiceId, poId, invoiceType, apiPrefix]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  // Load client credit balance dynamically
  useEffect(() => {
    if (item) {
      const clientId = item.clientSnapshot?.id || (item as any).clientId;
      if (clientId) {
        apiFetch<{ totalCreditBase: number; payments: any[] }>(`${apiPrefix}/clients/${clientId}/credit-balance?_t=${Date.now()}`)
          .then(res => {
            setCreditBalance(res.totalCreditBase || 0);
            setCreditPayments(res.payments || []);
          })
          .catch(err => console.warn("Failed to load client credit balance:", err));
      }
    }
  }, [item, apiPrefix]);

  const unpaidAmountBase = useMemo(() => {
    if (!item) return 0;
    const cache = (item as any).totalsCache || {};
    const totalIntended = cache.totalIntendedBase || 0;
    const totalReceived = cache.totalReceivedBase || 0;
    return Math.max(0, totalIntended - totalReceived);
  }, [item]);

  const liveTotals = useMemo(() => {
    if (!item) return { subtotal: 0, tax: 0, total: 0 };
    return computeInvoiceTotals(
        item.pages,
        item.documentInfo.taxRate ?? 5,
        item.documentInfo.taxEnabled !== false
    );
  }, [item]);

  const previewDocData = useMemo((): InvoiceDocData | null => {
    if (!item) return null;
    const base = toDocData(item);
    const manualWords = String((item.extras as Record<string, unknown>).amountInWords ?? "").trim();
    return {
      ...base,
      currency: item.currency,
      totals: liveTotals,
      extras: {
        ...base.extras,
        amountInWords:
            manualWords ||
            (item.currency === "AED"
                ? aedAmountInWords(liveTotals.total)
                : `${liveTotals.total.toFixed(2)} ${item.currency || "USD"} Only.`),
      },
    };
  }, [item, liveTotals]);

  async function downloadPdf() {
    const el = document.getElementById("invoice-print-root");
    if (!el) {
      setMsg("Invoice layout not ready — refresh and try again.");
      return;
    }
    setPdfExporting(true);
    setMsg("");
    try {
      const raw = (item?.invoiceNumber ?? "invoice").replace(/[\\/:*?"<>|]+/g, "-").trim() || "invoice";
      const fileName = raw.toLowerCase().endsWith(".pdf") ? raw : `${raw}.pdf`;
      await exportInvoicePdf(el as HTMLElement, fileName);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "PDF download failed");
    } finally {
      setPdfExporting(false);
    }
  }

  async function save(): Promise<boolean> {
    if (!item) return false;
    setSaving(true);
    clearSaveFeedback();
    setMsg("");
    try {
      const payload = {
        invoiceNumber: item.invoiceNumber,
        invoiceType: item.invoiceType,
        currency: item.currency,
        status: item.status,
        dueDate: item.dueDate,
        documentInfo: item.documentInfo,
        clientSnapshot: item.clientSnapshot,
        companySnapshot: item.companySnapshot,
        pages: item.pages,
        extras: { ...item.extras, _hiddenUntilSaved: false },
        branding: item.branding,
      };
      if (!invoiceId) {
        const createJson = await apiFetch<{ id?: string }>("/api/admin/invoices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ poId: item.poId, invoiceType: item.invoiceType ?? invoiceType }),
        });
        const createdId = String(createJson.id ?? "").trim();
        if (!createdId) throw new Error("Missing invoice id");

        await apiFetch(`/api/admin/invoices/${createdId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        setMsg("Saved.");
        router.replace(`${pathPrefix}/invoices/${createdId}`);
        return true;
      }

      await apiFetch(`${apiPrefix}/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      showSaveSuccess();
      await load();
      return true;
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Save failed");
      return false;
    } finally {
      setSaving(false);
    }
  }

  const handleItemChange = useCallback((next: Item) => {
    setItem((prev) => {
      if (!prev) return next;
      const prevDate = prev.documentInfo.date;
      const nextDate = next.documentInfo.date;
      let finalNext = next;

      if (prevDate !== nextDate) {
        const terms = String(next.extras?.paymentTerms ?? "");
        const days = parsePaymentTermsDays(terms);
        if (days !== null) {
          const baseDate = nextDate ? new Date(nextDate) : new Date();
          if (!isNaN(baseDate.getTime())) {
            const due = new Date(baseDate.getTime());
            due.setDate(due.getDate() + days);
            finalNext = {
              ...next,
              dueDate: due.toISOString(),
            };
          }
        }
      }
      return finalNext;
    });
  }, []);

  function patchExtra<K extends string>(key: K, value: any) {
    setItem((prev) => {
      if (!prev) return null;
      const nextExtras = { ...prev.extras, [key]: value };
      let nextDueDate = prev.dueDate;

      if (key === "paymentTerms") {
        const days = parsePaymentTermsDays(String(value));
        if (days !== null) {
          const baseDate = prev.documentInfo.date ? new Date(prev.documentInfo.date) : new Date();
          if (!isNaN(baseDate.getTime())) {
            const due = new Date(baseDate.getTime());
            due.setDate(due.getDate() + days);
            nextDueDate = due.toISOString();
          }
        }
      }

      return {
        ...prev,
        extras: nextExtras,
        dueDate: nextDueDate,
      };
    });
  }

  function patchBank(which: "bankAed" | "bankUsd", field: keyof Bank, value: string) {
    setItem((prev) => {
      if (!prev) return null;
      const cur = (prev.extras[which] as Bank) ?? {};
      return {
        ...prev,
        extras: {
          ...prev.extras,
          [which]: { ...cur, [field]: value },
        },
      };
    });
  }

  function patchLine(idx: number, partial: Partial<Item["pages"][0]["items"][0]>) {
    setItem((prev) => {
      if (!prev) return null;
      const pages = prev.pages.map((p) => ({
        ...p,
        items: p.items.map((row, i) => (i === idx ? { ...row, ...partial } : row)),
      }));
      return { ...prev, pages };
    });
  }

  function addLine() {
    setItem((prev) => {
      if (!prev?.pages[0]) return prev;
      const items = prev.pages[0].items;
      const nextNo = Math.max(0, ...items.map((r) => r.number)) + 1;
      const nextItems = [
        ...items,
        { number: nextNo, name: "", description: "", quantity: 1, price: 0 },
      ];
      return {
        ...prev,
        pages: [{ ...prev.pages[0], items: nextItems }],
      };
    });
  }

  function removeLine(idx: number) {
    setItem((prev) => {
      if (!prev?.pages[0] || prev.pages[0].items.length <= 1) return prev;
      return {
        ...prev,
        pages: [
          {
            ...prev.pages[0],
            items: prev.pages[0].items.filter((_, i) => i !== idx),
          },
        ],
      };
    });
  }

  function copyBillToShip() {
    setItem((prev) => {
      if (!prev) return null;
      const trn = String((prev.extras as Record<string, unknown>).clientTrn ?? "");
      const addr = [
        prev.clientSnapshot.company,
        prev.clientSnapshot.address,
        trn ? `TRN: ${trn}` : "",
      ]
        .filter((x) => String(x ?? "").trim())
        .join("\n");
      return {
        ...prev,
        extras: {
          ...prev.extras,
          shipToCompany: String(prev.clientSnapshot.name ?? ""),
          shipToAddress: addr,
          shipToTrn: trn,
        },
      };
    });
  }



  if (loading && !error) {
    return (
      <div className="animate-fade-in space-y-6">
        <Skeleton className="h-9 w-48 max-w-full" />
        <div className="mt-6 grid gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <Skeleton className="h-[28rem] w-full rounded-xl" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-[28rem] w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  const extras = (item?.extras ?? {}) as Record<string, unknown>;
  const bankAed = (extras.bankAed as Bank) ?? {};
  const bankUsd = (extras.bankUsd as Bank) ?? {};
  const taxRatePreview = item?.documentInfo.taxRate ?? 5;
  const taxEnabledPreview = item?.documentInfo.taxEnabled !== false;
  const taxLabelPreview = taxEnabledPreview ? `Tax (${taxRatePreview}%)` : "Tax";
  return (
    <div className="animate-fade-in">
      <DashboardPageHeader title={item ? item.invoiceNumber : "Invoice"} />
      {poInvoiceCount != null ? (
        <p className="text-muted-foreground mt-1 text-xs">
          Invoices on this PO: {poInvoiceCount}
        </p>
      ) : null}
      <SaveSuccessToast message={successMessage} />
      {error ? (
        <div className="mb-4 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {item && previewDocData ? (
        <div className="mt-6 grid gap-8 lg:grid-cols-2 print:grid-cols-1">
          <EditorPanel
            item={item}
            extras={extras}
            bankAed={bankAed}
            bankUsd={bankUsd}
            taxLabelPreview={taxLabelPreview}
            liveTotals={liveTotals}
            saving={saving}
            pdfExporting={pdfExporting}
            msg={msg}
            onItemChange={handleItemChange}
            onPatchExtra={patchExtra}
            onPatchBank={patchBank}
            onPatchLine={patchLine}
            onAddLine={addLine}
            onRemoveLine={removeLine}
            onCopyBillToShip={copyBillToShip}
            onSave={() => setShowSaveConfirm(true)}
            onDownloadPdf={() => void downloadPdf()}
            onOpenLedger={() => setLedgerOpen(true)}
            creditBalance={creditBalance}
            onApplyCreditClick={() => setCreditModalOpen(true)}
            apiPrefix={apiPrefix}
          />

          <div className="flex flex-col gap-8 print:col-span-full">
            <div>
              <p className="text-muted-foreground mb-2 text-xs print:hidden">Live preview</p>
              <InvoiceSecDocument data={previewDocData} />
            </div>
          </div>
        </div>
      ) : null}

      <InvoicePrintStyle />

      <SaveConfirmModal
        open={showSaveConfirm}
        onClose={() => setShowSaveConfirm(false)}
        onConfirm={async () => {
          setShowSaveConfirm(false);
          await save();
        }}
        loading={saving}
        entityName="invoice"
      />

      {item && (
        <ApplyCreditModal
          isOpen={creditModalOpen}
          onClose={() => setCreditModalOpen(false)}
          onSuccess={async () => {
            showSaveSuccess();
            await load();
            // Reload credits
            const clientId = item.clientSnapshot?.id || (item as any).clientId;
            if (clientId) {
              const res = await apiFetch<{ totalCreditBase: number; payments: any[] }>(
                `${apiPrefix}/clients/${clientId}/credit-balance?_t=${Date.now()}`
              );
              setCreditBalance(res.totalCreditBase || 0);
              setCreditPayments(res.payments || []);
            }
          }}
          invoiceId={String(item._id)}
          invoiceNumber={item.invoiceNumber}
          invoiceCurrency={String(item.currency || item.invoiceType || "AED").toUpperCase()}
          invoiceUnpaidBase={unpaidAmountBase}
          creditPayments={creditPayments}
          apiPrefix={apiPrefix}
        />
      )}
    </div>
  );
}
