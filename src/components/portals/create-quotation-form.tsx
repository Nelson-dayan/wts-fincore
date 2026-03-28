"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Download, FileText, FileType2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils/cn";
import {
  computePreviewTotals,
  defaultQuotationBranding,
  type QuotationBrandingState,
} from "@/lib/portals/quotation-preview-utils";
import type { QuotationRenderDraft } from "@/lib/services/business/quotation-render.types";
import { sanitizeDraftForServerRender } from "@/lib/portals/quotation-draft-sanitize";

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

type ProjectOption = { _id: string; name: string };

type PreviewClient = {
  name: string;
  company: string;
  address: string;
  logoText: string;
  signatureText: string;
};

type PreviewCompany = {
  name: string;
  address: string;
  email: string;
  website: string;
  logoUrl: string;
  logoText: string;
  signatureText: string;
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

function emptyClient(): PreviewClient {
  return { name: "—", company: "", address: "", logoText: "", signatureText: "" };
}

function emptyCompany(): PreviewCompany {
  return {
    name: "—",
    address: "",
    email: "",
    website: "",
    logoUrl: "",
    logoText: "",
    signatureText: "",
  };
}

async function fileToText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

/** Keeps text inputs strictly controlled (avoids defined → undefined React warning). */
function s(v: string | undefined | null): string {
  return v ?? "";
}

function lineNumberValue(n: unknown): number {
  const x = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(x)) return 1;
  return Math.max(1, Math.floor(x));
}

function lineQtyPriceValue(n: unknown, fallback: number): number {
  const x = typeof n === "number" ? n : Number(n);
  return Number.isFinite(x) ? x : fallback;
}

export function CreateQuotationForm({
  prefillProjectId = "",
  defaultCollapsed = false,
}: {
  prefillProjectId?: string;
  defaultCollapsed?: boolean;
} = {}) {
  const [showForm, setShowForm] = useState(() => !defaultCollapsed);
  const [projectQuery, setProjectQuery] = useState("");
  const [projectId, setProjectId] = useState("");
  const [projectLabel, setProjectLabel] = useState("");
  const [projectOptions, setProjectOptions] = useState<ProjectOption[]>([]);
  const [previewClient, setPreviewClient] = useState<PreviewClient>(emptyClient);
  const [previewCompany, setPreviewCompany] = useState<PreviewCompany>(emptyCompany);
  const [quotationCode, setQuotationCode] = useState("");
  const [docDate, setDocDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [taxRate, setTaxRate] = useState("0");
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [status, setStatus] = useState<"draft" | "sent" | "approved" | "rejected">("draft");
  const [leadTime, setLeadTime] = useState("");
  const [terms, setTerms] = useState("");
  const [validity, setValidity] = useState("");
  const [remainingText, setRemainingText] = useState("");
  const [remainingAmount, setRemainingAmount] = useState("");
  const [confirmDate, setConfirmDate] = useState("");
  const [pages, setPages] = useState<PageBlock[]>([
    { pageNumber: 1, items: [emptyLine(1)] },
  ]);
  const [branding, setBranding] = useState<QuotationBrandingState>(() =>
    defaultQuotationBranding()
  );
  const [internalNotes, setInternalNotes] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  /** True while a render request is in flight (first load or after edits). */
  const [pdfPreviewBusy, setPdfPreviewBusy] = useState(true);
  const [pdfError, setPdfError] = useState("");
  /** After first successful PDF, use a longer debounce so we don't hit the API on every keystroke. */
  const pdfPreviewHasSucceeded = useRef(false);

  useEffect(() => {
    setShowForm(!defaultCollapsed);
  }, [defaultCollapsed]);

  useEffect(() => {
    if (!prefillProjectId) return;
    let alive = true;
    async function loadProject() {
      try {
        const response = await fetch(`/api/admin/projects/${prefillProjectId}/details`, {
          cache: "no-store",
        });
        const payload = (await response.json()) as {
          project?: { _id: string; name: string };
          message?: string;
        };
        if (!alive || !response.ok || !payload.project) return;
        setProjectId(String(payload.project._id));
        setProjectLabel(payload.project.name);
      } catch {
        /* ignore */
      }
    }
    loadProject();
    return () => {
      alive = false;
    };
  }, [prefillProjectId]);

  useEffect(() => {
    let alive = true;
    async function loadProjects() {
      const response = await fetch(
        `/api/admin/projects?page=1&limit=12&q=${encodeURIComponent(projectQuery)}`,
        { cache: "no-store" }
      );
      const payload = (await response.json()) as { items?: ProjectOption[] };
      if (alive) setProjectOptions(payload.items ?? []);
    }
    loadProjects();
    return () => {
      alive = false;
    };
  }, [projectQuery]);

  useEffect(() => {
    let alive = true;
    async function loadPrimaryCompany() {
      try {
        const companyRes = await fetch("/api/admin/company", { cache: "no-store" });
        const companyPayload = (await companyRes.json()) as {
          item?: {
            name?: string;
            address?: string;
            email?: string;
            website?: string;
            logoText?: string;
            signatureText?: string;
            defaultTax?: { taxRate?: number; taxEnabled?: boolean };
          };
        };
        if (!alive || !companyRes.ok || !companyPayload.item) return;
        const co = companyPayload.item;
        setPreviewCompany({
          name: String(co.name ?? "").trim() || "—",
          address: String(co.address ?? "").trim(),
          email: String(co.email ?? "").trim(),
          website: String(co.website ?? "").trim(),
          logoUrl: "",
          logoText: String(co.logoText ?? "").trim(),
          signatureText: String(co.signatureText ?? "").trim(),
        });
        if (co.defaultTax) {
          setTaxRate(String(Number(co.defaultTax.taxRate ?? 0)));
          setTaxEnabled(Boolean(co.defaultTax.taxEnabled));
        }
      } catch {
        /* ignore */
      }
    }
    loadPrimaryCompany();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!projectId) {
      setPreviewClient(emptyClient());
      return;
    }
    let alive = true;
    async function loadClientForProject() {
      try {
        const projectRes = await fetch(`/api/admin/projects/${projectId}/details`, {
          cache: "no-store",
        });
        const projectPayload = (await projectRes.json()) as {
          client?: {
            name?: string;
            company?: string;
            address?: string;
            clientLogoText?: string;
            clientSignatureText?: string;
          };
          message?: string;
        };
        if (!alive || !projectRes.ok || !projectPayload.client) return;
        const c = projectPayload.client;
        setPreviewClient({
          name: String(c.name ?? "").trim() || "—",
          company: String(c.company ?? "").trim(),
          address: String(c.address ?? "").trim(),
          logoText: String(c.clientLogoText ?? "").trim(),
          signatureText: String(c.clientSignatureText ?? "").trim(),
        });
      } catch {
        /* ignore */
      }
    }
    loadClientForProject();
    return () => {
      alive = false;
    };
  }, [projectId]);

  const previewTotals = useMemo(
    () =>
      computePreviewTotals(
        pages.map((p) => ({
          items: p.items.map((i) => ({ quantity: i.quantity, price: i.price })),
        })),
        Number(taxRate || 0),
        taxEnabled
      ),
    [pages, taxRate, taxEnabled]
  );

  const renderDraft = useMemo((): QuotationRenderDraft => {
    return {
      quotationNumberLabel: "Preview (unsaved)",
      status,
      documentInfo: {
        quotationCode,
        date: (() => {
          const d = new Date(docDate);
          return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
        })(),
        subject,
        title,
        description,
        taxRate: Number(taxRate || 0),
        taxEnabled,
      },
      clientSnapshot: {
        name: previewClient.name.trim() || "—",
        company: previewClient.company || undefined,
        address: previewClient.address || undefined,
        logoText: previewClient.logoText || undefined,
        signatureText: previewClient.signatureText || undefined,
      },
      companySnapshot: {
        name: previewCompany.name.trim() || "—",
        address: previewCompany.address || undefined,
        email: previewCompany.email || undefined,
        website: previewCompany.website || undefined,
        logoUrl: previewCompany.logoUrl || undefined,
        logoText: previewCompany.logoText || undefined,
        signatureText: previewCompany.signatureText || undefined,
      },
      pages: pages.map((p) => ({
        pageNumber: p.pageNumber,
        items: p.items.map((item) => ({
          number: item.number,
          name: item.name.trim() || "—",
          quantity: Number(item.quantity) || 0,
          price: Number(item.price) || 0,
        })),
      })),
      totals: previewTotals,
      quotationInfo: {
        leadTime: leadTime || undefined,
        terms: terms || undefined,
        validity: validity || undefined,
        remainingText: remainingText || undefined,
        confirmDate:
          confirmDate === ""
            ? undefined
            : (() => {
                const d = new Date(confirmDate);
                return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
              })(),
      },
      branding: {
        useCompanyLogo: branding.useCompanyLogo,
        useCompanySignature: branding.useCompanySignature,
        showClientSignature: branding.showClientSignature,
        customLogoText: branding.customLogoText,
        customSignatureText: branding.customSignatureText,
      },
    };
  }, [
    status,
    quotationCode,
    docDate,
    subject,
    title,
    description,
    taxRate,
    taxEnabled,
    previewClient,
    previewCompany,
    pages,
    previewTotals,
    leadTime,
    terms,
    validity,
    remainingText,
    confirmDate,
    branding,
  ]);

  useEffect(() => {
    const abort = new AbortController();
    const debounceMs = pdfPreviewHasSucceeded.current ? 950 : 450;

    const timer = setTimeout(async () => {
      setPdfPreviewBusy(true);
      setPdfError("");
      const payload = sanitizeDraftForServerRender(renderDraft);
      try {
        const res = await fetch("/api/admin/quotations/render", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ format: "pdf", draft: payload }),
          signal: abort.signal,
        });
        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as { message?: string };
          throw new Error(err.message ?? "Could not build PDF preview");
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setPdfBlobUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
        setPdfError("");
        pdfPreviewHasSucceeded.current = true;
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setPdfError(e instanceof Error ? e.message : "Preview failed");
      } finally {
        if (!abort.signal.aborted) setPdfPreviewBusy(false);
      }
    }, debounceMs);

    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [renderDraft]);

  useEffect(
    () => () => {
      setPdfBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    },
    []
  );

  async function downloadRendered(format: "pdf" | "docx") {
    setPdfError("");
    try {
      const payload = sanitizeDraftForServerRender(renderDraft);
      const res = await fetch("/api/admin/quotations/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, draft: payload }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(err.message ?? "Download failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = format === "pdf" ? "quotation.pdf" : "quotation.docx";
      a.rel = "noopener";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setPdfError(e instanceof Error ? e.message : "Download failed");
    }
  }

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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setMessage("");
    try {
      const payloadPages = pages.map((p) => ({
        pageNumber: p.pageNumber,
        items: p.items.map((item) => ({
          number: item.number,
          name: item.name.trim(),
          displayName: item.displayName.trim(),
          description: item.description.trim(),
          quantity: Number(item.quantity) || 0,
          price: Number(item.price) || 0,
          length: item.length === "" ? undefined : Number(item.length),
          width: item.width === "" ? undefined : Number(item.width),
        })),
      }));

      const response = await fetch("/api/admin/quotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          status,
          internalNotes,
          branding,
          documentInfo: {
            quotationCode,
            date: new Date(docDate).toISOString(),
            subject,
            title,
            description,
            taxRate: Number(taxRate || 0),
            taxEnabled,
          },
          clientSnapshot: {
            name: previewClient.name,
            company: previewClient.company,
            address: previewClient.address,
            logoText: previewClient.logoText,
            signatureText: previewClient.signatureText,
          },
          companySnapshot: {
            name: previewCompany.name,
            address: previewCompany.address,
            email: previewCompany.email,
            website: previewCompany.website,
            logoUrl: previewCompany.logoUrl,
            logoText: previewCompany.logoText,
            signatureText: previewCompany.signatureText,
          },
          pages: payloadPages,
          quotationInfo: {
            leadTime,
            terms,
            validity,
            remainingText,
            remainingAmount:
              remainingAmount === "" ? undefined : Number(remainingAmount),
            confirmDate: confirmDate === "" ? undefined : confirmDate,
          },
        }),
      });
      const result = (await response.json()) as {
        message?: string;
        item?: { _id?: string };
      };
      if (!response.ok) throw new Error(result.message ?? "Create failed");
      setMessage("Quotation saved.");
      const createdId = result.item?._id;
      setTimeout(() => {
        window.location.href = createdId
          ? `/admin/quotations/${createdId}`
          : "/admin/quotations";
      }, 400);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Create failed");
    } finally {
      setPending(false);
    }
  }

  const collapsedLanding = defaultCollapsed && !showForm;

  return (
    <div className="mb-6">
      {collapsedLanding ? (
        <div
          className={cn(
            "flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-8 text-center",
            "dark:border-white/8 dark:bg-white/2"
          )}
        >
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            Create a quotation with a live PDF preview (A4). Internal notes stay in the form only —
            they are not shown on the document.
          </p>
          <Button
            type="button"
            variant="outline"
            className="gap-2 rounded-full"
            onClick={() => setShowForm(true)}
          >
            <FileText className="size-4" aria-hidden />
            Create quotation
          </Button>
        </div>
      ) : (
                <Card className="overflow-hidden border-border/60 bg-card/95 shadow-[0_1px_0_0_rgba(15,23,42,0.04),0_24px_48px_-12px_rgba(15,23,42,0.12)] backdrop-blur-[2px] dark:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.45)]">
          <CardHeader className="flex flex-col gap-3 space-y-0 border-b border-border/50 bg-linear-to-b from-muted/30 to-transparent sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-primary/20 via-primary/10 to-primary/5 text-primary shadow-sm ring-1 ring-primary/20">
                <FileText className="size-5" strokeWidth={1.75} aria-hidden />
              </span>
              <div>
                <CardTitle className="text-lg font-semibold tracking-tight">Create quotation</CardTitle>
                <CardDescription className="mt-1 max-w-xl text-[0.8125rem] leading-relaxed">
                  Edits on the left update the PDF preview on the right. Save stores the quotation;
                  download PDF or Word anytime.
                </CardDescription>
              </div>
            </div>
            {defaultCollapsed ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="shrink-0 rounded-full text-muted-foreground"
                onClick={() => setShowForm(false)}
              >
                Hide
              </Button>
            ) : null}
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit}>
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,560px)]">
                <div className="min-w-0 space-y-4 print:hidden">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="space-y-1 sm:col-span-2">
                      <Label>Project</Label>
                      <Input
                        value={s(projectQuery)}
                        onChange={(e) => setProjectQuery(e.target.value)}
                        placeholder="Search project by name"
                      />
                      {projectOptions.length > 0 ? (
                        <div className="mt-1 max-h-40 overflow-auto rounded-lg border border-border bg-background p-1 text-sm">
                          {projectOptions.map((p) => (
                            <button
                              key={p._id}
                              type="button"
                              className="flex w-full rounded-md px-2 py-1.5 text-left hover:bg-muted"
                              onClick={() => {
                                setProjectId(p._id);
                                setProjectLabel(p.name);
                                setProjectQuery("");
                              }}
                            >
                              {p.name}
                            </button>
                          ))}
                        </div>
                      ) : null}
                      {projectLabel ? (
                        <p className="text-xs text-muted-foreground">
                          Selected: <strong>{projectLabel}</strong>
                        </p>
                      ) : null}
                    </div>

                    <div className="space-y-1 rounded-lg border border-dashed border-border/80 bg-muted/15 p-3 sm:col-span-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Internal only (not on quotation PDF)
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="space-y-1">
                          <Label className="text-muted-foreground">Project ID</Label>
                          <Input value={s(projectId) || "—"} readOnly className="font-mono text-xs" />
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <Label className="text-muted-foreground">Internal notes</Label>
                          <textarea
                            value={s(internalNotes)}
                            onChange={(e) => setInternalNotes(e.target.value)}
                            rows={3}
                            className="flex min-h-[80px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                            placeholder="Team-only context, CRM links, follow-ups…"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 rounded-lg border border-border/70 p-3 sm:col-span-2">
                      <p className="text-sm font-medium">Our company (on quotation)</p>
                      <p className="text-xs text-muted-foreground">
                        Loaded from primary company settings; edit here for this document only.
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="space-y-1 sm:col-span-2">
                          <Label>Upload logo</Label>
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const text = await fileToText(file);
                              setPreviewCompany((c) => ({ ...c, logoText: text }));
                              e.target.value = "";
                            }}
                          />
                          {previewCompany.logoText ? (
                            <div className="pt-1">
                              <img
                                src={previewCompany.logoText}
                                alt="Company logo preview"
                                className="h-12 max-w-[200px] rounded-md border border-border object-contain"
                              />
                            </div>
                          ) : null}
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <Label>Address</Label>
                          <textarea
                            value={s(previewCompany.address)}
                            onChange={(e) =>
                              setPreviewCompany((c) => ({ ...c, address: e.target.value }))
                            }
                            rows={3}
                            className="flex min-h-[72px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Email</Label>
                          <Input
                            value={s(previewCompany.email)}
                            onChange={(e) =>
                              setPreviewCompany((c) => ({ ...c, email: e.target.value }))
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Website</Label>
                          <Input
                            value={s(previewCompany.website)}
                            onChange={(e) =>
                              setPreviewCompany((c) => ({ ...c, website: e.target.value }))
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 rounded-lg border border-border/70 p-3 sm:col-span-2">
                      <p className="text-sm font-medium">Client (on quotation)</p>
                      <p className="text-xs text-muted-foreground">
                        Selecting a project fills these fields; you can edit them anytime.
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="space-y-1">
                          <Label>Client name</Label>
                          <Input
                            value={s(previewClient.name)}
                            onChange={(e) =>
                              setPreviewClient((c) => ({ ...c, name: e.target.value }))
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Company</Label>
                          <Input
                            value={s(previewClient.company)}
                            onChange={(e) =>
                              setPreviewClient((c) => ({ ...c, company: e.target.value }))
                            }
                          />
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <Label>Address</Label>
                          <textarea
                            value={s(previewClient.address)}
                            onChange={(e) =>
                              setPreviewClient((c) => ({ ...c, address: e.target.value }))
                            }
                            rows={3}
                            className="flex min-h-[72px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Upload client logo</Label>
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const text = await fileToText(file);
                              setPreviewClient((c) => ({ ...c, logoText: text }));
                              e.target.value = "";
                            }}
                          />
                          {previewClient.logoText ? (
                            <div className="pt-1">
                              <img
                                src={previewClient.logoText}
                                alt="Client logo preview"
                                className="h-12 max-w-[200px] rounded-md border border-border object-contain"
                              />
                            </div>
                          ) : null}
                        </div>
                        <div className="space-y-1">
                          <Label>Upload client signature</Label>
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const text = await fileToText(file);
                              setPreviewClient((c) => ({ ...c, signatureText: text }));
                              e.target.value = "";
                            }}
                          />
                          {previewClient.signatureText ? (
                            <div className="pt-1">
                              <img
                                src={previewClient.signatureText}
                                alt="Client signature preview"
                                className="h-12 max-w-[240px] rounded-md border border-border object-contain object-left"
                              />
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label>Status</Label>
                      <Select
                        value={status ?? "draft"}
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
                        value={s(docDate)}
                        onChange={(e) => setDocDate(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Quotation code</Label>
                      <Input
                        value={s(quotationCode)}
                        onChange={(e) => setQuotationCode(e.target.value)}
                        placeholder="e.g. internal reference"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Subject</Label>
                      <Input value={s(subject)} onChange={(e) => setSubject(e.target.value)} />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label>Title</Label>
                      <Input value={s(title)} onChange={(e) => setTitle(e.target.value)} />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label>Description</Label>
                      <Input value={s(description)} onChange={(e) => setDescription(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label>Tax rate (%)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={s(taxRate)}
                        onChange={(e) => setTaxRate(e.target.value)}
                      />
                    </div>
                    <div className="flex items-end gap-2 pb-1">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={taxEnabled}
                          onChange={(e) => setTaxEnabled(e.target.checked)}
                        />
                        Tax enabled
                      </label>
                    </div>
                  </div>

                  <div className="space-y-3 rounded-lg border border-border/70 p-3">
                      <p className="text-sm font-medium">Branding on document</p>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={branding.useCompanyLogo}
                          onChange={(e) => {
                            const v = e.target.checked;
                            setBranding((b) => ({
                              ...b,
                              useCompanyLogo: v,
                              customLogoText: v ? "" : s(b.customLogoText),
                            }));
                          }}
                        />
                        Use primary company logo (from company settings)
                      </label>
                      {!branding.useCompanyLogo ? (
                        <div className="space-y-1">
                          <Label>Custom logo (image)</Label>
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const text = await fileToText(file);
                              setBranding((b) => ({ ...b, customLogoText: text }));
                            }}
                          />
                        </div>
                      ) : null}
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={branding.useCompanySignature}
                          onChange={(e) => {
                            const v = e.target.checked;
                            setBranding((b) => ({
                              ...b,
                              useCompanySignature: v,
                              customSignatureText: v ? "" : s(b.customSignatureText),
                            }));
                          }}
                        />
                        Use primary company signature (from company settings)
                      </label>
                      {!branding.useCompanySignature ? (
                        <div className="space-y-1">
                          <Label>Custom company signature (image)</Label>
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const text = await fileToText(file);
                              setBranding((b) => ({ ...b, customSignatureText: text }));
                            }}
                          />
                        </div>
                      ) : null}
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={branding.showClientSignature}
                          onChange={(e) =>
                            setBranding((b) => ({
                              ...b,
                              showClientSignature: e.target.checked,
                            }))
                          }
                        />
                        Show client signature block (from client fields above)
                      </label>
                  </div>

                  {pages.map((page, pageIdx) => (
                    <div key={page.pageNumber} className="rounded-xl border border-border/70 p-3">
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
                            {page.items.map((item, lineIdx) => (
                              <tr key={`${page.pageNumber}-${item.number}-${lineIdx}`} className="border-t border-border/60">
                                <td className="py-1 pr-2">
                                  <Input
                                    className="h-8"
                                    type="number"
                                    min={1}
                                    value={lineNumberValue(item.number)}
                                    onChange={(e) => {
                                      const raw = e.target.value;
                                      const v = raw === "" ? 1 : Number(raw);
                                      const next = Number.isFinite(v) ? Math.max(1, Math.floor(v)) : 1;
                                      setPages((prev) => {
                                        const copy = prev.map((p) => ({
                                          ...p,
                                          items: p.items.map((row) => ({ ...row })),
                                        }));
                                        copy[pageIdx].items[lineIdx].number = next;
                                        return copy;
                                      });
                                    }}
                                  />
                                </td>
                                <td className="py-1 pr-2">
                                  <Input
                                    className="h-8"
                                    value={s(item.name)}
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
                                    required
                                  />
                                </td>
                                <td className="py-1 pr-2">
                                  <Input
                                    className="h-8"
                                    type="number"
                                    min={0}
                                    value={lineQtyPriceValue(item.quantity, 0)}
                                    onChange={(e) => {
                                      const raw = e.target.value;
                                      const v = raw === "" ? 0 : Number(raw);
                                      const next = Number.isFinite(v) ? v : 0;
                                      setPages((prev) => {
                                        const copy = prev.map((p) => ({
                                          ...p,
                                          items: p.items.map((row) => ({ ...row })),
                                        }));
                                        copy[pageIdx].items[lineIdx].quantity = next;
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
                                    value={lineQtyPriceValue(item.price, 0)}
                                    onChange={(e) => {
                                      const raw = e.target.value;
                                      const v = raw === "" ? 0 : Number(raw);
                                      const next = Number.isFinite(v) ? v : 0;
                                      setPages((prev) => {
                                        const copy = prev.map((p) => ({
                                          ...p,
                                          items: p.items.map((row) => ({ ...row })),
                                        }));
                                        copy[pageIdx].items[lineIdx].price = next;
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

                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label>Lead time</Label>
                      <Input value={s(leadTime)} onChange={(e) => setLeadTime(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label>Validity</Label>
                      <Input value={s(validity)} onChange={(e) => setValidity(e.target.value)} />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label>Terms</Label>
                      <Input value={s(terms)} onChange={(e) => setTerms(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label>Remaining amount</Label>
                      <Input
                        type="number"
                        value={s(remainingAmount)}
                        onChange={(e) => setRemainingAmount(e.target.value)}
                        placeholder="Optional"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Confirm date</Label>
                      <Input
                        type="date"
                        value={s(confirmDate)}
                        onChange={(e) => setConfirmDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label>Remaining text</Label>
                      <Input value={s(remainingText)} onChange={(e) => setRemainingText(e.target.value)} />
                    </div>
                  </div>

                  {message ? (
                    <p className="text-sm text-muted-foreground">{message}</p>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" disabled={pending || !projectId}>
                      {pending ? "Saving…" : "Save quotation"}
                    </Button>
                  </div>
                </div>

                <div className="min-w-0 space-y-3 print:hidden xl:sticky xl:top-4 xl:self-start">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="submit" disabled={pending || !projectId} size="sm">
                      {pending ? "Saving…" : "Save"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void downloadRendered("pdf")}
                    >
                      <Download className="mr-2 size-4" aria-hidden />
                      Download PDF
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void downloadRendered("docx")}
                    >
                      <FileType2 className="mr-2 size-4" aria-hidden />
                      Download Word
                    </Button>
                    {pdfPreviewBusy ? (
                      <span className="text-xs text-muted-foreground">Refreshing PDF…</span>
                    ) : null}
                  </div>
                  {pdfError ? (
                    <p className="text-sm text-destructive">{pdfError}</p>
                  ) : null}
                  <div className="overflow-hidden rounded-2xl border border-border/60 bg-linear-to-b from-muted/40 to-muted/15 shadow-inner ring-1 ring-black/3 dark:from-white/6 dark:to-white/2 dark:ring-white/10">
                    <div className="border-b border-border/50 bg-linear-to-r from-primary/7 via-transparent to-transparent px-4 py-3">
                      <p className="text-xs font-semibold tracking-wide text-foreground/90">
                        Live PDF preview
                      </p>
                      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                        A4 layout — extra pages when needed. The preview waits until you pause typing
                        (~1s), then refreshes. Large pasted images may be trimmed for preview only.
                      </p>
                    </div>
                    {pdfBlobUrl ? (
                      <div className="relative bg-[#525659] p-2 sm:p-3">
                        <div className="overflow-hidden rounded-lg bg-white shadow-[0_4px_24px_rgba(0,0,0,0.18)] ring-1 ring-black/5">
                          <iframe
                            title="Quotation PDF preview"
                            src={`${pdfBlobUrl}#view=FitH`}
                            className="h-[min(78vh,920px)] w-full bg-white"
                          />
                        </div>
                        {pdfPreviewBusy ? (
                          <div className="pointer-events-none absolute inset-x-0 top-6 flex justify-center sm:top-8">
                            <span className="rounded-full border border-border/70 bg-background/95 px-3 py-1.5 text-xs font-medium shadow-md backdrop-blur-sm">
                              Updating preview…
                            </span>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="flex min-h-[min(78vh,920px)] flex-col items-center justify-center gap-3 px-4 text-center text-sm text-muted-foreground">
                        {pdfPreviewBusy ? (
                          <>
                            <span
                              className="inline-block size-9 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary"
                              aria-hidden
                            />
                            <span>Generating PDF preview…</span>
                          </>
                        ) : pdfError ? (
                          <span className="text-destructive">{pdfError}</span>
                        ) : (
                          <span>Edit the form — the preview will appear here.</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
