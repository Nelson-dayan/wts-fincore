"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { InvoiceSecDocument, type InvoiceDocData } from "@/components/invoices/invoice-sec-document";
import { aedAmountInWords } from "@/lib/invoice/aed-amount-words";
import { computeInvoiceTotals } from "@/lib/invoice/invoice-totals";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Bank = {
  accountName?: string;
  accountNo?: string;
  iban?: string;
  bankName?: string;
  swift?: string;
};

type Item = {
  _id?: string;
  invoiceNumber: string;
  projectId: string;
  poId: string;
  status: string;
  documentInfo: {
    date?: string;
    title?: string;
    subject?: string;
    taxRate?: number;
    taxEnabled?: boolean;
  };
  clientSnapshot: Record<string, string | undefined>;
  companySnapshot: Record<string, string | undefined>;
  pages: Array<{
    pageNumber: number;
    items: Array<{
      number: number;
      name: string;
      description: string;
      quantity: number;
      price: number;
    }>;
  }>;
  totals: { subtotal: number; tax: number; total: number };
  extras: Record<string, unknown>;
  dueDate: string;
  createdAt?: string;
};

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

function formatAedAmount(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function readImageFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result ?? ""));
    r.onerror = () => reject(r.error ?? new Error("read failed"));
    r.readAsDataURL(file);
  });
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
  const manualWordsPreview = String(extras.amountInWords ?? "").trim();
  const wordsPreview = manualWordsPreview || aedAmountInWords(liveTotals.total);

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

      {item ? (
        <div className="mt-3 flex flex-wrap gap-2 print:hidden">
          <Link href="/admin/invoices">
            <Button size="sm" variant="outline">
              All invoices
            </Button>
          </Link>
          {item.poId ? (
            <Link href={`/admin/purchase-orders/${item.poId}`}>
              <Button size="sm" variant="outline">
                Open PO
              </Button>
            </Link>
          ) : null}
          <Link href={`/admin/projects/${item.projectId}`}>
            <Button size="sm" variant="outline">
              Open project
            </Button>
          </Link>
          <Button size="sm" variant="secondary" onClick={() => window.print()}>
            Print / PDF
          </Button>
        </div>
      ) : null}

      {item && previewDocData ? (
        <div className="mt-6 grid gap-8 lg:grid-cols-2">
          <div className="print:hidden space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">1 · Heading &amp; numbers</CardTitle>
                <p className="text-muted-foreground text-xs">
                  On the printed PDF, title (default INVOICE) and invoice # appear in the left header.
                </p>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Document title (e.g. INVOICE)</Label>
                  <Input
                    value={String(item.documentInfo.title ?? "")}
                    placeholder="INVOICE"
                    onChange={(e) =>
                      setItem({
                        ...item,
                        documentInfo: { ...item.documentInfo, title: e.target.value },
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Invoice number</Label>
                  <Input
                    value={item.invoiceNumber}
                    onChange={(e) => setItem({ ...item, invoiceNumber: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Invoice date</Label>
                  <Input
                    type="date"
                    value={
                      item.documentInfo.date ? item.documentInfo.date.slice(0, 10) : ""
                    }
                    onChange={(e) =>
                      setItem({
                        ...item,
                        documentInfo: {
                          ...item.documentInfo,
                          date: e.target.value
                            ? new Date(`${e.target.value}T12:00:00.000Z`).toISOString()
                            : item.documentInfo.date,
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Due date</Label>
                  <Input
                    type="date"
                    value={item.dueDate ? item.dueDate.slice(0, 10) : ""}
                    onChange={(e) =>
                      setItem({
                        ...item,
                        dueDate: e.target.value
                          ? new Date(e.target.value + "T12:00:00").toISOString()
                          : item.dueDate,
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Payment terms</Label>
                  <Input
                    list="invoice-payment-terms-presets"
                    value={String(extras.paymentTerms ?? "")}
                    onChange={(e) => patchExtra("paymentTerms", e.target.value)}
                    placeholder="e.g. 30 DAYS"
                  />
                  <datalist id="invoice-payment-terms-presets">
                    <option value="7 DAYS" />
                    <option value="15 DAYS" />
                    <option value="30 DAYS" />
                    <option value="45 DAYS" />
                    <option value="60 DAYS" />
                    <option value="Due on receipt" />
                  </datalist>
                </div>
                <div className="space-y-1.5">
                  <Label>PO # (print text)</Label>
                  <Input
                    value={String(extras.poNumberRef ?? "")}
                    onChange={(e) => patchExtra("poNumberRef", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Tax %</Label>
                  <Input
                    type="number"
                    min={0}
                    value={item.documentInfo.taxRate ?? 5}
                    onChange={(e) =>
                      setItem({
                        ...item,
                        documentInfo: {
                          ...item.documentInfo,
                          taxRate: Number(e.target.value),
                        },
                      })
                    }
                  />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={item.documentInfo.taxEnabled !== false}
                      onChange={(e) =>
                        setItem({
                          ...item,
                          documentInfo: {
                            ...item.documentInfo,
                            taxEnabled: e.target.checked,
                          },
                        })
                      }
                    />
                    Tax enabled
                  </label>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Status</Label>
                  <select
                    value={item.status}
                    onChange={(e) => setItem({ ...item, status: e.target.value })}
                    className="border-input/90 bg-background flex h-10 w-full rounded-lg border px-3 text-sm"
                  >
                    <option value="unpaid">unpaid</option>
                    <option value="partial">partial</option>
                    <option value="paid">paid</option>
                    <option value="overdue">overdue</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">2 · Company (from)</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <div className="space-y-1.5">
                  <Label>Name</Label>
                  <Input
                    value={String(item.companySnapshot.name ?? "")}
                    onChange={(e) =>
                      setItem({
                        ...item,
                        companySnapshot: { ...item.companySnapshot, name: e.target.value },
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Address</Label>
                  <textarea
                    value={String(item.companySnapshot.address ?? "")}
                    onChange={(e) =>
                      setItem({
                        ...item,
                        companySnapshot: { ...item.companySnapshot, address: e.target.value },
                      })
                    }
                    rows={3}
                    className="border-border bg-background flex w-full rounded-lg border px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Company TRN</Label>
                  <Input
                    value={String(extras.companyTrn ?? "")}
                    onChange={(e) => patchExtra("companyTrn", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Logo URL (optional)</Label>
                  <Input
                    value={String(item.companySnapshot.logoUrl ?? "")}
                    onChange={(e) =>
                      setItem({
                        ...item,
                        companySnapshot: { ...item.companySnapshot, logoUrl: e.target.value },
                      })
                    }
                    placeholder="https://… ya data URL"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    className="sr-only"
                    onChange={(e) => void onLogoPicked(e.target.files)}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => logoInputRef.current?.click()}
                  >
                    Choose logo image
                  </Button>
                  {logoErr ? (
                    <span className="text-destructive text-xs">{logoErr}</span>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base">3 · Bill to / Ship to</CardTitle>
                  <Button type="button" size="sm" variant="secondary" onClick={copyBillToShip}>
                    Same as Bill to
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2 border-b border-border/60 pb-3">
                  <p className="text-xs font-semibold uppercase text-neutral-500">Bill to</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Client name</Label>
                  <Input
                    value={String(item.clientSnapshot.name ?? "")}
                    onChange={(e) =>
                      setItem({
                        ...item,
                        clientSnapshot: { ...item.clientSnapshot, name: e.target.value },
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Company</Label>
                  <Input
                    value={String(item.clientSnapshot.company ?? "")}
                    onChange={(e) =>
                      setItem({
                        ...item,
                        clientSnapshot: { ...item.clientSnapshot, company: e.target.value },
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Address</Label>
                  <textarea
                    value={String(item.clientSnapshot.address ?? "")}
                    onChange={(e) =>
                      setItem({
                        ...item,
                        clientSnapshot: { ...item.clientSnapshot, address: e.target.value },
                      })
                    }
                    rows={2}
                    className="border-border bg-background flex w-full rounded-lg border px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Client TRN</Label>
                  <Input
                    value={String(extras.clientTrn ?? "")}
                    onChange={(e) => patchExtra("clientTrn", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2 border-b border-border/60 pb-1 pt-2">
                  <p className="text-xs font-semibold uppercase text-neutral-500">Ship to</p>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Ship to — first line (company / name)</Label>
                  <Input
                    value={String(extras.shipToCompany ?? "")}
                    onChange={(e) => patchExtra("shipToCompany", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Ship to address</Label>
                  <textarea
                    value={String(extras.shipToAddress ?? "")}
                    onChange={(e) => patchExtra("shipToAddress", e.target.value)}
                    rows={3}
                    className="border-border bg-background flex w-full rounded-lg border px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Ship to TRN</Label>
                  <Input
                    value={String(extras.shipToTrn ?? "")}
                    onChange={(e) => patchExtra("shipToTrn", e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base">4 · Line items</CardTitle>
                  <Button type="button" size="sm" variant="outline" onClick={addLine}>
                    Add row
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="overflow-x-auto rounded-lg border border-border/80">
                  <table className="w-full min-w-130 text-sm">
                    <thead>
                      <tr className="bg-muted/60 border-b text-left text-xs font-semibold">
                        <th className="p-2 w-10">#</th>
                        <th className="p-2 min-w-45">Item</th>
                        <th className="p-2 min-w-30">Note (optional)</th>
                        <th className="p-2 w-20 text-right">Qty</th>
                        <th className="p-2 w-24 text-right">Rate</th>
                        <th className="p-2 w-24 text-right">Amount</th>
                        <th className="p-2 w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      {(item.pages[0]?.items ?? []).map((row, idx) => {
                        const amt = (Number(row.quantity) || 0) * (Number(row.price) || 0);
                        return (
                          <tr key={row.number} className="border-b border-border/50 align-top">
                            <td className="text-muted-foreground p-2 tabular-nums">{row.number}</td>
                            <td className="p-1">
                              <Input
                                className="h-9 border-0 shadow-none focus-visible:ring-1"
                                value={row.name}
                                onChange={(e) => patchLine(idx, { name: e.target.value })}
                                placeholder="Description"
                              />
                            </td>
                            <td className="p-1">
                              <Input
                                className="h-9 border-0 text-xs shadow-none focus-visible:ring-1"
                                value={row.description}
                                onChange={(e) => patchLine(idx, { description: e.target.value })}
                              />
                            </td>
                            <td className="p-1">
                              <Input
                                className="h-9 border-0 text-right tabular-nums shadow-none focus-visible:ring-1"
                                type="number"
                                min={0}
                                value={row.quantity}
                                onChange={(e) =>
                                  patchLine(idx, { quantity: Number(e.target.value) })
                                }
                              />
                            </td>
                            <td className="p-1">
                              <Input
                                className="h-9 border-0 text-right tabular-nums shadow-none focus-visible:ring-1"
                                type="number"
                                min={0}
                                step="0.01"
                                value={row.price}
                                onChange={(e) =>
                                  patchLine(idx, { price: Number(e.target.value) })
                                }
                              />
                            </td>
                            <td className="p-2 text-right text-xs font-medium tabular-nums">
                              {formatAedAmount(amt)}
                            </td>
                            <td className="p-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-destructive h-8 px-2"
                                onClick={() => removeLine(idx)}
                                disabled={(item.pages[0]?.items.length ?? 0) <= 1}
                              >
                                ×
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="bg-muted/40 rounded-lg border border-border/60 p-3 text-sm">
                  <p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
                    Live totals (preview jaisa)
                  </p>
                  <div className="flex flex-wrap justify-between gap-x-8 gap-y-1">
                    <span className="text-neutral-600">Subtotal</span>
                    <span className="tabular-nums font-medium">
                      AED {formatAedAmount(liveTotals.subtotal)}
                    </span>
                  </div>
                  <div className="flex flex-wrap justify-between gap-x-8 gap-y-1">
                    <span className="text-neutral-600">{taxLabelPreview}</span>
                    <span className="tabular-nums font-medium">
                      AED {formatAedAmount(liveTotals.tax)}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap justify-between gap-x-8 gap-y-1 border-t border-border/60 pt-2 font-semibold">
                    <span>Total / Balance due</span>
                    <span className="tabular-nums">AED {formatAedAmount(liveTotals.total)}</span>
                  </div>
                  <p className="text-muted-foreground mt-2 border-t border-border/40 pt-2 text-center text-xs italic leading-snug">
                    {wordsPreview}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">5 · AED / USD accounts &amp; footer</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                {(["bankAed", "bankUsd"] as const).map((bk) => {
                  const b = bk === "bankAed" ? bankAed : bankUsd;
                  const label = bk === "bankAed" ? "AED ACCOUNT DETAILS" : "USD ACCOUNT DETAILS";
                  return (
                    <div key={bk} className="border-border/60 space-y-2 rounded-lg border p-3">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-700">
                        {label}
                      </p>
                      {(["accountName", "accountNo", "iban", "bankName", "swift"] as const).map(
                        (f) => (
                          <div key={`${bk}-${f}`} className="space-y-1">
                            <Label className="text-[11px] capitalize">
                              {f.replace(/([A-Z])/g, " $1")}
                            </Label>
                            <Input
                              value={String(b[f] ?? "")}
                              onChange={(e) => patchBank(bk, f, e.target.value)}
                            />
                          </div>
                        )
                      )}
                    </div>
                  );
                })}
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Amount in words (auto on save; override here)</Label>
                  <textarea
                    value={String(extras.amountInWords ?? "")}
                    onChange={(e) => patchExtra("amountInWords", e.target.value)}
                    rows={2}
                    className="border-border bg-background flex w-full rounded-lg border px-3 py-2 text-sm"
                    placeholder="Leave blank to use total"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Footer terms</Label>
                  <Input
                    value={String(extras.footerTerms ?? "")}
                    onChange={(e) => patchExtra("footerTerms", e.target.value)}
                    placeholder="TERM: …"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Currency line</Label>
                  <Input
                    value={String(extras.footerCurrencyLine ?? "")}
                    onChange={(e) => patchExtra("footerCurrencyLine", e.target.value)}
                    placeholder="CURRENCY IN AED"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Disclaimer</Label>
                  <textarea
                    value={String(extras.disclaimer ?? "")}
                    onChange={(e) => patchExtra("disclaimer", e.target.value)}
                    rows={2}
                    className="border-border bg-background flex w-full rounded-lg border px-3 py-2 text-sm"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => void save()} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
              {msg ? (
                <p
                  className={
                    msg === "Saved." ? "text-primary text-sm" : "text-destructive text-sm"
                  }
                  role="status"
                >
                  {msg}
                </p>
              ) : null}
            </div>
          </div>

          <div className="print:col-span-full">
            <p className="text-muted-foreground mb-2 text-xs print:hidden">Live preview</p>
            <InvoiceSecDocument data={previewDocData} />
          </div>
        </div>
      ) : null}

      <style
        dangerouslySetInnerHTML={{
          __html: `@media print {
            body * { visibility: hidden; }
            #invoice-print-root, #invoice-print-root * { visibility: visible; }
            #invoice-print-root { position: absolute; left: 0; top: 0; width: 100%; }
          }`,
        }}
      />
    </div>
  );
}
