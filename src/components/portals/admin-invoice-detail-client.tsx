"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { EditorPanel } from "@/components/portals/admin-invoice-detail/editor-panel";
import { InvoicePrintStyle } from "@/components/portals/admin-invoice-detail/print-style";
import type { Bank, Item } from "@/components/portals/admin-invoice-detail/types";
import { previewWords, readImageFileAsDataUrl } from "@/components/portals/admin-invoice-detail/utils";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { InvoiceSecDocument, type InvoiceDocData } from "@/components/invoices/invoice-sec-document";
import { aedAmountInWords } from "@/lib/invoice/aed-amount-words";
import { computeInvoiceTotals } from "@/lib/invoice/invoice-totals";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";


function toDocData(item: Item): InvoiceDocData {
  const extras = item.extras as InvoiceDocData["extras"];
  return {
    invoiceNumber: item.invoiceNumber,
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
  poInvoiceCount,
}: {
  invoiceId: string;
  /** When opened from PO context, show sibling count hint. */
  poInvoiceCount?: number;
}) {
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [logoErr, setLogoErr] = useState("");
  const logoInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/invoices/${invoiceId}`, { cache: "no-store" });
      const data = (await res.json()) as { item?: Item; message?: string };
      if (!res.ok) throw new Error(data.message ?? "Failed to load");
      if (!data.item) throw new Error("Missing invoice");
      setItem(data.item as Item);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setItem(null);
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

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
        amountInWords: manualWords || aedAmountInWords(liveTotals.total),
      },
    };
  }, [item, liveTotals]);

  async function save() {
    if (!item) return;
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch(`/api/admin/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceNumber: item.invoiceNumber,
          status: item.status,
          dueDate: item.dueDate,
          documentInfo: item.documentInfo,
          clientSnapshot: item.clientSnapshot,
          companySnapshot: item.companySnapshot,
          pages: item.pages,
          extras: item.extras,
        }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message ?? "Save failed");
      setMsg("Saved.");
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Save failed");
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

  async function onLogoPicked(files: FileList | null) {
    const f = files?.[0];
    setLogoErr("");
    if (!f || !item) return;
    if (!/^image\/(png|jpe?g|webp)$/i.test(f.type)) {
      setLogoErr("Use PNG, JPG, or WebP for the logo.");
      return;
    }
    if (f.size > 2 * 1024 * 1024) {
      setLogoErr("Logo must be under 2 MB.");
      return;
    }
    try {
      const dataUrl = await readImageFileAsDataUrl(f);
      setItem({
        ...item,
        companySnapshot: { ...item.companySnapshot, logoUrl: dataUrl },
      });
    } catch {
      setLogoErr("Could not read logo file.");
    } finally {
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  }

  if (loading && !error) {
    return <p className="text-muted-foreground text-sm">Loading…</p>;
  }

  const extras = (item?.extras ?? {}) as Record<string, unknown>;
  const bankAed = (extras.bankAed as Bank) ?? {};
  const bankUsd = (extras.bankUsd as Bank) ?? {};
  const taxRatePreview = item?.documentInfo.taxRate ?? 5;
  const taxEnabledPreview = item?.documentInfo.taxEnabled !== false;
  const taxLabelPreview = taxEnabledPreview ? `Tax (${taxRatePreview}%)` : "Tax";
  const wordsPreview = previewWords(extras, liveTotals.total);

  return (
    <div className="animate-fade-in">
      <DashboardPageHeader
        title={item ? item.invoiceNumber : "Invoice"}
        description="SecLance-style invoice. Form follows print order; preview updates as you type. Saving syncs totals and amount in words to the database."
      />
      {poInvoiceCount != null ? (
        <p className="text-muted-foreground mt-1 text-xs">
          Invoices on this PO: {poInvoiceCount}
        </p>
      ) : null}
      {error ? (
        <div className="mb-4 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {item && previewDocData ? (
        <div className="mt-6 grid gap-8 lg:grid-cols-2">
          <EditorPanel
            item={item}
            extras={extras}
            bankAed={bankAed}
            bankUsd={bankUsd}
            logoErr={logoErr}
            logoInputRef={logoInputRef}
            taxLabelPreview={taxLabelPreview}
            liveTotals={liveTotals}
            wordsPreview={wordsPreview}
            saving={saving}
            msg={msg}
            onItemChange={setItem}
            onPatchExtra={patchExtra}
            onPatchBank={patchBank}
            onPatchLine={patchLine}
            onAddLine={addLine}
            onRemoveLine={removeLine}
            onCopyBillToShip={copyBillToShip}
            onPickLogo={onLogoPicked}
            onSave={() => void save()}
          />

          <div className="print:col-span-full">
            <p className="text-muted-foreground mb-2 text-xs print:hidden">Live preview</p>
            <InvoiceSecDocument data={previewDocData} />
          </div>
        </div>
      ) : null}

      <InvoicePrintStyle />
    </div>
  );
}
