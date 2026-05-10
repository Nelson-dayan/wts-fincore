"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { EditorPanel } from "@/components/portals/admin-invoice-detail/editor-panel";
import { PaymentsCard } from "@/components/portals/admin-invoice-detail/payments-card";
import { InvoicePrintStyle } from "@/components/portals/admin-invoice-detail/print-style";
import type { Bank, Item } from "@/components/portals/admin-invoice-detail/types";
import { readImageFileAsDataUrl } from "@/components/portals/admin-invoice-detail/utils";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { InvoiceSecDocument, type InvoiceDocData } from "@/components/invoices/invoice-sec-document";
import { aedAmountInWords } from "@/lib/invoice/aed-amount-words";
import { computeInvoiceTotals } from "@/lib/invoice/invoice-totals";
import { exportInvoicePdf } from "@/utils/exportPdf";
import { readResponseJson } from "@/lib/http/read-response-json";
import { Skeleton } from "@/components/ui/skeleton";
import { SaveSuccessToast } from "@/components/ui/save-success-toast";
import { usePortalConfig } from "@/components/portals/portal-config-context";
import { useSaveFeedback } from "@/lib/hooks/use-save-feedback";


function toDocData(item: Item): InvoiceDocData {
  const extras = item.extras as InvoiceDocData["extras"];
  return {
    invoiceNumber: item.invoiceNumber,
    invoiceType: item.invoiceType ?? "aed",
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
  const [companyRates, setCompanyRates] = useState<{ usdToInr: number; aedToInr: number; isLocked: boolean }>({
    usdToInr: 83.5,
    aedToInr: 22.7,
    isLocked: false,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const endpoint = invoiceId
        ? `${apiPrefix}/invoices/${invoiceId}`
        : `${apiPrefix}/invoices/template?poId=${encodeURIComponent(
            String(poId ?? "")
          )}&invoiceType=${encodeURIComponent(invoiceType)}`;
      const res = await fetch(endpoint, { cache: "no-store" });
      const data = await readResponseJson<{ item?: Item; message?: string }>(res);
      if (!res.ok) throw new Error(data.message ?? "Failed to load");
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

  useEffect(() => {
    fetch(`${apiPrefix}/company`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.item?.defaultExchangeRates) {
          setCompanyRates({
            usdToInr: data.item.defaultExchangeRates.usdToInr ?? 83.5,
            aedToInr: data.item.defaultExchangeRates.aedToInr ?? 22.7,
            isLocked: !!data.item.defaultExchangeRates.isLocked,
          });
        }
      })
      .catch(console.error);
  }, [apiPrefix]);

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
      totals: liveTotals,
      extras: {
        ...base.extras,
        amountInWords:
          manualWords ||
          (item.invoiceType === "usd"
            ? `${liveTotals.total.toFixed(2)} US Dollars Only.`
            : aedAmountInWords(liveTotals.total)),
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
        const createRes = await fetch(`${apiPrefix}/invoices`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ poId: item.poId, invoiceType: item.invoiceType ?? invoiceType }),
        });
        const createJson = await readResponseJson<{ id?: string; message?: string }>(createRes);
        if (!createRes.ok) throw new Error(createJson.message ?? "Create failed");
        const createdId = String(createJson.id ?? "").trim();
        if (!createdId) throw new Error("Missing invoice id");
        const patchRes = await fetch(`${apiPrefix}/invoices/${createdId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const patchJson = await readResponseJson<{ message?: string }>(patchRes);
        if (!patchRes.ok) throw new Error(patchJson.message ?? "Save failed");
        setMsg("Saved.");
        router.replace(`${pathPrefix}/invoices/${createdId}`);
        return true;
      }

      const res = await fetch(`${apiPrefix}/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await readResponseJson<{ message?: string }>(res);
      if (!res.ok) throw new Error(data.message ?? "Save failed");
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

  function patchExtra<K extends string>(key: K, value: string) {
    setItem((prev) =>
      prev
        ? {
            ...prev,
            extras: { ...prev.extras, [key]: value },
          }
        : null
    );
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
            onItemChange={setItem}
            onPatchExtra={patchExtra}
            onPatchBank={patchBank}
            onPatchLine={patchLine}
            onAddLine={addLine}
            onRemoveLine={removeLine}
            onCopyBillToShip={copyBillToShip}
            onSave={() => void save()}
            onDownloadPdf={() => void downloadPdf()}
            companyRates={companyRates}
          />

          <div className="flex flex-col gap-8 print:col-span-full">
            <div>
              <p className="text-muted-foreground mb-2 text-xs print:hidden">Live preview</p>
              <InvoiceSecDocument data={previewDocData} />
            </div>

            {invoiceId && item._id && (
              <div className="print:hidden">
                <PaymentsCard 
                  invoiceId={item._id} 
                  companyId={String(item.companyId || "")} 
                  invoiceCurrency={item.currency || (item.invoiceType === "usd" ? "USD" : "AED")}
                  invoiceExchangeRate={item.exchangeRate || 1}
                  invoiceTotalAmount={liveTotals.total}
                  invoiceTotalsCache={item.totalsCache}
                  fixCurrency={item.fixCurrency}
                />
              </div>
            )}
          </div>
        </div>
      ) : null}

      <InvoicePrintStyle />
    </div>
  );
}
