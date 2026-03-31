"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { QuotationPurchaseOrdersSection } from "@/components/portals/quotation-purchase-orders-section";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type LineItem = {
  number: number;
  name: string;
  displayName: string;
  description: string;
  quantity: number;
  price: number;
  length: string;
  width: string;
};

type PageBlock = {
  pageNumber: number;
  items: LineItem[];
};

type QuotationPayload = {
  _id: string;
  quotationNumber: string;
  projectId: string;
  projectName?: string;
  status: "draft" | "sent" | "approved" | "rejected";
  documentInfo: {
    quotationCode?: string;
    geCode?: string;
    date: string;
    subject: string;
    title: string;
    description: string;
    taxRate: number;
    taxEnabled: boolean;
  };
  clientSnapshot: {
    name: string;
    company: string;
    address: string;
    logoText?: string;
    signatureText?: string;
  };
  companySnapshot: {
    name: string;
    address: string;
    email: string;
    website: string;
    logoUrl: string;
    logoText?: string;
    signatureText?: string;
  };
  branding?: {
    useCompanyLogo?: boolean;
    useCompanySignature?: boolean;
    showClientSignature?: boolean;
    customLogoText?: string;
    customSignatureText?: string;
  };
  internalNotes?: string;
  pages: Array<{
    pageNumber: number;
    items: Array<{
      number: number;
      name: string;
      displayName?: string;
      description?: string;
      length?: number;
      width?: number;
      quantity: number;
      price: number;
    }>;
  }>;
  totals: { subtotal: number; tax: number; total: number };
  quotationInfo: {
    leadTime?: string;
    confirmDate?: string;
    terms?: string;
    validity?: string;
    remainingAmount?: number;
    remainingText?: string;
  };
  message?: string;
};

function emptyLine(n: number): LineItem {
  return {
    number: n,
    name: "",
    displayName: "",
    description: "",
    quantity: 1,
    price: 0,
    length: "",
    width: "",
  };
}

function toIsoDateOrNow(dateInput: string): string {
  const d = new Date(dateInput);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function mapPagesFromApi(pages: QuotationPayload["pages"]): PageBlock[] {
  return pages.map((p) => ({
    pageNumber: p.pageNumber,
    items: p.items.map((item) => ({
      number: item.number,
      name: item.name,
      displayName: item.displayName ?? "",
      description: item.description ?? "",
      quantity: item.quantity,
      price: typeof item.price === "number" ? item.price : Number(item.price),
      length: item.length !== undefined ? String(item.length) : "",
      width: item.width !== undefined ? String(item.width) : "",
    })),
  }));
}

export function AdminQuotationDetailsClient({ quotationId }: { quotationId: string }) {
  const router = useRouter();
  const [item, setItem] = useState<QuotationPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshSnapshots, setRefreshSnapshots] = useState(false);

  const [status, setStatus] = useState<QuotationPayload["status"]>("draft");
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

  async function load() {
    setLoading(true);
    setError("");
    try {
    const response = await fetch(`/api/admin/quotations/${quotationId}`, {
      cache: "no-store",
    });
    const payload = (await response.json()) as { item?: QuotationPayload; message?: string };
    if (!response.ok) throw new Error(payload.message ?? "Failed to load quotation");
    const q = payload.item;
    if (!q) throw new Error("Missing quotation");
    setItem(q);
    setStatus(q.status);
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
  }, [quotationId]);

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

  async function save() {
    setSaving(true);
    setError("");
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

      const response = await fetch(`/api/admin/quotations/${quotationId}`, {
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
          internalNotes,
        }),
      });
      const result = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) {
        throw new Error(result.message ?? `Failed to save (HTTP ${response.status}).`);
      }
      setEditing(false);
      setRefreshSnapshots(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/quotations/${quotationId}`, {
        method: "DELETE",
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(result.message ?? "Failed to delete");
      router.push("/admin/quotations");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
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
        title={item ? `Quotation ${item.quotationNumber}` : "Quotation"}
        description="When the client PO arrives, upload it in the green section below. Edit the rest of the quotation here."
      />
      {error ? (
        <div className="mb-4 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {item ? (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            <Link href="/admin/quotations">
              <Button size="sm" variant="outline">
                Back to quotations
              </Button>
            </Link>
            <Button size="sm" variant="outline" asChild>
              <a href={`/api/admin/quotations/${quotationId}/export?format=pdf`}>
                Download PDF
              </a>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <a href={`/api/admin/quotations/${quotationId}/export?format=docx`}>
                Download Word
              </a>
            </Button>
            <Link href={`/admin/projects/${item.projectId}`}>
              <Button size="sm" variant="outline">
                Open project
              </Button>
            </Link>
            <Link href={`/admin/quotations?projectId=${encodeURIComponent(item.projectId)}`}>
              <Button size="sm" variant="outline">
                All quotations for project
              </Button>
            </Link>
          </div>

          <QuotationPurchaseOrdersSection
            quotationId={item._id}
            projectId={item.projectId}
            quotationStatus={item.status}
            quotationNumber={item.quotationNumber}
          />

          <Card className="mb-4">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base">Summary</CardTitle>
                <div className="flex flex-wrap gap-2">
                  {editing ? (
                    <>
                      <Button size="sm" onClick={save} disabled={saving}>
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditing(false);
                          setRefreshSnapshots(false);
                          load().catch(() => {});
                        }}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                      Edit
                    </Button>
                  )}
                  <Button size="sm" variant="destructive" onClick={remove} disabled={saving}>
                    Delete
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
              <p>
                <strong>Project:</strong> {item.projectName ?? item.projectId}
              </p>
              <p>
                <strong>Status:</strong> {item.status}
              </p>
              <p>
                <strong>Subtotal:</strong> {item.totals.subtotal}
              </p>
              <p>
                <strong>Tax:</strong> {item.totals.tax}
              </p>
              <p>
                <strong>Total:</strong> {item.totals.total}
              </p>
            </CardContent>
          </Card>

          <Card className="mb-4 border-dashed">
            <CardHeader>
              <CardTitle className="text-base">Internal (not on client PDF)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>
                <strong>Project ID:</strong>{" "}
                <span className="font-mono text-xs">{item.projectId}</span>
              </p>
              {editing ? (
                <div className="space-y-1">
                  <Label>Internal notes</Label>
                  <textarea
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    rows={4}
                    className="flex min-h-25 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  />
                </div>
              ) : (
                <p className="whitespace-pre-wrap text-muted-foreground">
                  {internalNotes || "—"}
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-base">Snapshots</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
              <p>
                <strong>Client:</strong> {item.clientSnapshot.name} ({item.clientSnapshot.company})
              </p>
              <p>
                <strong>Client address:</strong> {item.clientSnapshot.address || "-"}
              </p>
              <p>
                <strong>Company:</strong> {item.companySnapshot.name}
              </p>
              <p>
                <strong>Company email:</strong> {item.companySnapshot.email || "-"}
              </p>
            </CardContent>
          </Card>

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

          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-base">Document</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {editing ? (
                <>
                  <div className="space-y-1">
                    <Label>Status</Label>
                    <Select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as typeof status)}
                      options={[
                        { value: "draft", label: "draft" },
                        { value: "sent", label: "sent" },
                        { value: "approved", label: "approved" },
                        { value: "rejected", label: "rejected" },
                      ]}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Document date</Label>
                    <Input
                      type="date"
                      value={docDate}
                      onChange={(e) => setDocDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Quotation code</Label>
                    <Input
                      value={quotationCode}
                      onChange={(e) => setQuotationCode(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Subject</Label>
                    <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label>Title</Label>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label>Description</Label>
                    <Input value={description} onChange={(e) => setDescription(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Tax rate (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={taxRate}
                      onChange={(e) => setTaxRate(e.target.value)}
                    />
                  </div>
                  <div className="flex items-end pb-1">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={taxEnabled}
                        onChange={(e) => setTaxEnabled(e.target.checked)}
                      />
                      Tax enabled
                    </label>
                  </div>
                </>
              ) : (
                <>
                  <p>
                    <strong>Date:</strong> {docDate ? new Date(docDate).toLocaleDateString() : "-"}
                  </p>
                  <p>
                    <strong>Quotation code:</strong> {quotationCode || "-"}
                  </p>
                  <p>
                    <strong>Subject:</strong> {subject || "-"}
                  </p>
                  <p>
                    <strong>Title:</strong> {title || "-"}
                  </p>
                  <p className="sm:col-span-2">
                    <strong>Description:</strong> {description || "-"}
                  </p>
                  <p>
                    <strong>Tax:</strong> {taxEnabled ? `${taxRate}%` : "off"}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-base">Line items</CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <>
                  {pages.map((page, pageIdx) => (
                    <div
                      key={page.pageNumber}
                      className="mb-4 rounded-xl border border-border/70 p-3 last:mb-0"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-sm font-medium">Page {page.pageNumber}</p>
                        <Button type="button" size="sm" variant="outline" onClick={() => addLine(pageIdx)}>
                          Add line
                        </Button>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full max-w-full table-fixed text-left text-sm">
                          <thead className="text-muted-foreground">
                            <tr>
                              <th className="py-1 pr-2">#</th>
                              <th className="py-1 pr-2">Name</th>
                              <th className="py-1 pr-2">Qty</th>
                              <th className="py-1 pr-2">Price</th>
                              <th className="py-1 pr-2" />
                            </tr>
                          </thead>
                          <tbody>
                            {page.items.map((line, lineIdx) => (
                              <tr
                                key={`${page.pageNumber}-${line.number}-${lineIdx}`}
                                className="border-t border-border/60"
                              >
                                <td className="py-1 pr-2">
                                  <Input
                                    className="h-8"
                                    type="number"
                                    min={1}
                                    value={line.number}
                                    onChange={(e) => {
                                      const v = Number(e.target.value);
                                      setPages((prev) => {
                                        const copy = prev.map((p) => ({
                                          ...p,
                                          items: p.items.map((row) => ({ ...row })),
                                        }));
                                        copy[pageIdx].items[lineIdx].number = v;
                                        return copy;
                                      });
                                    }}
                                  />
                                </td>
                                <td className="py-1 pr-2">
                                  <Input
                                    className="h-8"
                                    value={line.name}
                                    onChange={(e) => {
                                      const v = e.target.value;
                                      setPages((prev) => {
                                        const copy = prev.map((p) => ({
                                          ...p,
                                          items: p.items.map((row) => ({ ...row })),
                                        }));
                                        copy[pageIdx].items[lineIdx].name = v;
                                        return copy;
                                      });
                                    }}
                                  />
                                </td>
                                <td className="py-1 pr-2">
                                  <Input
                                    className="h-8"
                                    type="number"
                                    min={0}
                                    value={line.quantity}
                                    onChange={(e) => {
                                      const v = Number(e.target.value);
                                      setPages((prev) => {
                                        const copy = prev.map((p) => ({
                                          ...p,
                                          items: p.items.map((row) => ({ ...row })),
                                        }));
                                        copy[pageIdx].items[lineIdx].quantity = v;
                                        return copy;
                                      });
                                    }}
                                  />
                                </td>
                                <td className="py-1 pr-2">
                                  <Input
                                    className="h-8"
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    value={line.price}
                                    onChange={(e) => {
                                      const v = Number(e.target.value);
                                      setPages((prev) => {
                                        const copy = prev.map((p) => ({
                                          ...p,
                                          items: p.items.map((row) => ({ ...row })),
                                        }));
                                        copy[pageIdx].items[lineIdx].price = v;
                                        return copy;
                                      });
                                    }}
                                  />
                                </td>
                                <td className="py-1 pr-2 text-right">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => removeLine(pageIdx, lineIdx)}
                                  >
                                    Remove
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                  <Button type="button" variant="outline" onClick={addPage}>
                    Add page
                  </Button>
                </>
              ) : (
                <div className="space-y-3 text-sm">
                  {item.pages.map((p) => (
                    <div key={p.pageNumber}>
                      <p className="mb-1 font-medium">Page {p.pageNumber}</p>
                      <ul className="list-disc space-y-1 pl-5">
                        {p.items.map((row) => (
                          <li key={row.number}>
                            {row.name} — qty {row.quantity} × {row.price}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-base">Quotation info</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {editing ? (
                <>
                  <div className="space-y-1">
                    <Label>Lead time</Label>
                    <Input value={leadTime} onChange={(e) => setLeadTime(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Validity</Label>
                    <Input value={validity} onChange={(e) => setValidity(e.target.value)} />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label>Terms</Label>
                    <Input value={terms} onChange={(e) => setTerms(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Remaining amount</Label>
                    <Input
                      type="number"
                      value={remainingAmount}
                      onChange={(e) => setRemainingAmount(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Confirm date</Label>
                    <Input
                      type="date"
                      value={confirmDate}
                      onChange={(e) => setConfirmDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label>Remaining text</Label>
                    <Input value={remainingText} onChange={(e) => setRemainingText(e.target.value)} />
                  </div>
                </>
              ) : (
                <>
                  <p>
                    <strong>Lead time:</strong> {leadTime || "-"}
                  </p>
                  <p>
                    <strong>Validity:</strong> {validity || "-"}
                  </p>
                  <p className="sm:col-span-2">
                    <strong>Terms:</strong> {terms || "-"}
                  </p>
                  <p>
                    <strong>Remaining amount:</strong> {remainingAmount || "-"}
                  </p>
                  <p>
                    <strong>Confirm date:</strong>{" "}
                    {confirmDate ? new Date(confirmDate).toLocaleDateString() : "-"}
                  </p>
                  <p className="sm:col-span-2">
                    <strong>Remaining text:</strong> {remainingText || "-"}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
