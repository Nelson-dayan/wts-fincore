"use client";

import { useEffect, useState } from "react";
import { ImageUp, Plus, Save, Trash2, Sparkles, Building2, CheckCircle2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dropdown } from "@/components/ui/select";
import { cn } from "@/lib/utils/cn";
import { UploadCard } from "@/components/ui/upload-card";
import { SUPPORTED_CURRENCIES } from "@/lib/constants/finance";
import type { QuotationData, QuotationItem, QuotationPage } from "@/types/quotation-generator";

export type QuotationFormProps = {
  data: QuotationData;
  onChange: (next: QuotationData) => void;
  onReset: () => void;
  onSaveQuotation: () => void;
  onDownloadPdf: () => void;
  exporting?: boolean;
  saveNotice?: string | null;
  pdfError?: string | null;
  /** Shown in the card header (e.g. "New quotation" vs "Edit quotation"). */
  formTitle?: string;
  /** Admin embedded: close builder without navigating away. */
  onCancelEdit?: () => void;
  isCurrencyLocked?: boolean;
};


export function QuotationForm({
  data,
  onChange,
  onReset,
  onSaveQuotation,
  onDownloadPdf,
  exporting = false,
  saveNotice = null,
  pdfError = null,
  formTitle = "Quotation",
  onCancelEdit,
  isCurrencyLocked = false,
}: QuotationFormProps) {
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [autoFillNotice, setAutoFillNotice] = useState<string | null>(null);
  const [scopeMode, setScopeMode] = useState<"single" | "group">("single");

  useEffect(() => {
    const scope = (localStorage.getItem("scopeMode") as "single" | "group") || "single";
    setScopeMode(scope);

    if (scope === "single") {
      // Single Co Mode: Automatically fetch and load the active single company context
      async function loadActiveCompany() {
        try {
          const res = await fetch("/api/admin/company");
          if (!res.ok) return;
          const json = await res.json();
          if (json.item) {
            const comp = json.item;
            if (!data.companyName) {
              const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
              const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
              const prefix = comp.branding?.quotationPrefix || comp.quotationPrefix || "QT-";
              const generatedRef = `${prefix}${dateStr}-${randomSuffix}`;

              const addressParts = [
                comp.name,
                comp.address,
                comp.email ? `Email: ${comp.email}` : null,
                comp.phone ? `Tel: ${comp.phone}` : null,
                comp.taxId ? `TRN/Tax ID: ${comp.taxId}` : null,
              ].filter(Boolean);

              patch({
                companyName: comp.name,
                companyAddress: addressParts.join("\n"),
                logo: comp.branding?.logoUrl || comp.logoUrl || data.logo,
                currency: comp.baseCurrency || data.currency || "AED",
                refNo: data.refNo || generatedRef,
                contactEmail: comp.email || data.contactEmail,
                contactPhone: comp.phone || data.contactPhone,
                paymentMilestone: comp.branding?.invoiceFooter || comp.invoiceFooter || data.paymentMilestone,
              });
            }
          }
        } catch (err) {
          console.error("Failed to auto-load active single company details:", err);
        }
      }
      loadActiveCompany();
    } else {
      // Group View Mode: Fetch corporate tree so user can select issuing entity
      async function fetchCompanyHierarchy() {
        try {
          const res = await fetch("/api/admin/companies/tree");
          if (!res.ok) return;
          const json = await res.json();
          if (json.companies && Array.isArray(json.companies)) {
            setCompanies(json.companies);
          }
        } catch (err) {
          console.error("Failed to load companies for quotation auto-fill:", err);
        }
      }
      fetchCompanyHierarchy();
    }
  }, []);

  const handleAutoFillCompany = (companyId: string) => {
    setSelectedCompanyId(companyId);
    if (!companyId) return;

    const comp = companies.find((c) => c._id === companyId);
    if (!comp) return;

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const prefix = comp.branding?.quotationPrefix || "QT-";
    const generatedRef = `${prefix}${dateStr}-${randomSuffix}`;

    const addressParts = [
      comp.name,
      comp.address,
      comp.email ? `Email: ${comp.email}` : null,
      comp.phone ? `Tel: ${comp.phone}` : null,
      comp.taxId ? `TRN/Tax ID: ${comp.taxId}` : null,
    ].filter(Boolean);

    patch({
      companyName: comp.name,
      companyAddress: addressParts.join("\n"),
      logo: comp.branding?.logoUrl || comp.logoUrl || data.logo,
      currency: comp.baseCurrency || data.currency || "AED",
      refNo: generatedRef,
      contactEmail: comp.email || data.contactEmail,
      contactPhone: comp.phone || data.contactPhone,
      paymentMilestone: comp.branding?.invoiceFooter || data.paymentMilestone,
    });

    setAutoFillNotice(`Auto-filled details & branding from "${comp.name}" (${comp.code})`);
    setTimeout(() => setAutoFillNotice(null), 4500);
  };

  const patch = (partial: Partial<QuotationData>) => {
    onChange({ ...data, ...partial });
  };

  const setItem = (pageIndex: number, lineIndex: number, partial: Partial<QuotationItem>) => {
    const pages = data.pages.map((p, pIdx) => {
      if (pIdx !== pageIndex) return p;
      return {
        ...p,
        items: p.items.map((row, rIdx) => (rIdx === lineIndex ? { ...row, ...partial } : row)),
      };
    });
    patch({ pages });
  };

  const addRow = (pageIndex: number) => {
    const pages = data.pages.map((p, pIdx) => {
      if (pIdx !== pageIndex) return p;
      const num = p.items.length > 0 ? p.items[p.items.length - 1].number + 1 : 1;
      return {
        ...p,
        items: [...p.items, { number: num, name: "", description: "", quantity: 1, price: 0 }],
      };
    });
    patch({ pages });
  };

  const removeRow = (pageIndex: number, lineIndex: number) => {
    const pages = data.pages.map((p, pIdx) => {
      if (pIdx !== pageIndex) return p;
      return {
        ...p,
        items: p.items.filter((_, i) => i !== lineIndex),
      };
    });
    patch({ pages });
  };

  const addPage = () => {
    const pageNum = data.pages.length + 1;
    patch({
      pages: [
        ...data.pages,
        {
          pageNumber: pageNum,
          items: [{ number: 1, name: "", description: "", quantity: 1, price: 0 }],
        },
      ],
    });
  };

  const removePage = (pageIndex: number) => {
    if (data.pages.length <= 1) return;
    const pages = data.pages.filter((_, i) => i !== pageIndex).map((p, i) => ({ ...p, pageNumber: i + 1 }));
    patch({ pages });
  };

  return (
    <Card className="mx-auto w-full border-border/80 shadow-md">
      <CardHeader className="sticky top-10 z-50 flex flex-row items-center justify-between border-b border-border/80 bg-card/95 py-4 shadow-sm backdrop-blur supports-backdrop-filter:bg-card/80">
        <CardTitle>{formTitle}</CardTitle>
        <div className="flex items-center gap-2">
          {onCancelEdit ? (
            <Button size="sm" type="button" variant="ghost" onClick={onCancelEdit}>
              Cancel
            </Button>
          ) : null}
          <Button size="sm" type="button" variant="outline" onClick={onReset}>
            Reset
          </Button>
          <Button size="sm" type="button" variant="secondary" onClick={onSaveQuotation}>
            <Save className="mr-2 size-4" aria-hidden />
            Save quotation
          </Button>
          <Button size="sm" type="button" onClick={onDownloadPdf} disabled={exporting}>
            {exporting ? "Building PDF…" : "Download PDF"}
          </Button>
          {saveNotice ? (
            <span className="text-muted-foreground text-sm ml-2" role="status">
              {saveNotice}
            </span>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-6 pt-6">
        <fieldset className="grid gap-3 text-left">
          <UploadCard
            label="Upload logo"
            value={data.logo}
            onChange={(val) => patch({ logo: val || undefined })}
            placeholder="PNG, JPG, SVG"
          />
        </fieldset>

        <fieldset className="grid gap-4 text-left">
          <div className="grid gap-2">
            <Label htmlFor="qg-p1-title">Product / framework title (cover, accent)</Label>
            <Input
              id="qg-p1-title"
              value={data.page1Title}
              onChange={(e) => patch({ page1Title: e.target.value })}
              placeholder="e.g. QMetry Automation Framework (QAF)"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="qg-client">Client name</Label>
            <Input
              id="qg-client"
              value={data.clientName}
              onChange={(e) => patch({ clientName: e.target.value })}
              placeholder="Client name"
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <div className="grid gap-2">
              <Label htmlFor="qg-quotation-no">Quotation no</Label>
            <Input
              id="qg-quotation-no"
              value={data.refNo}
              onChange={(e) => patch({ refNo: e.target.value })}
              placeholder="e.g. QT-20260402-A1B2C3D4 (auto-filled for new quotes)"
            />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="qg-date">Date</Label>
              <Input
                id="qg-date"
                type="date"
                value={data.date}
                onChange={(e) => patch({ date: e.target.value })}
              />
            </div>
          </div>
          {/* Company Context Selector & Single Co. Lock */}
          {scopeMode === "group" && companies.length > 0 ? (
            <div className="rounded-xl border border-primary/25 bg-primary/5 p-3.5 grid gap-2 transition-all shadow-xs">
              <div className="flex items-center justify-between">
                <Label htmlFor="company-autofill-select" className="text-xs font-semibold text-primary flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-primary" /> Group View: Select Issuing Entity for Quotation
                </Label>
                {autoFillNotice && (
                  <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-in fade-in-50">
                    <CheckCircle2 className="h-3.5 w-3.5" /> {autoFillNotice}
                  </span>
                )}
              </div>
              <Dropdown
                id="company-autofill-select"
                value={selectedCompanyId}
                onValueChange={(val) => handleAutoFillCompany(val)}
                placeholder="-- Select Group Sub-Company / Branch --"
                searchable={true}
                options={[
                  { value: "", label: "-- Select Group Sub-Company / Branch --" },
                  ...companies.map((c) => ({
                    value: c._id,
                    label: `${c.name} [${c.code}]`,
                    badge: c.kind,
                    description: `Currency: ${c.baseCurrency} ${c.taxId ? `• Tax/TRN ID: ${c.taxId}` : ""}`,
                  })),
                ]}
              />
            </div>
          ) : (
            <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 grid gap-1.5 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-primary" /> Issuing Company Context
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground bg-background border px-2 py-0.5 rounded-full shadow-2xs">
                  <Lock className="h-3 w-3 text-muted-foreground" /> Single Entity Context Locked
                </span>
              </div>
              <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                {data.companyName || "Active Corporate Unit"}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Document ownership is tied to your active company context. Switch company from navbar to issue for a different entity.
              </p>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="qg-company">Company name</Label>
            <Input
              id="qg-company"
              value={data.companyName}
              onChange={(e) => patch({ companyName: e.target.value })}
              placeholder="Your company"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="qg-address">Company address</Label>
            <textarea
              id="qg-address"
              value={data.companyAddress}
              onChange={(e) => patch({ companyAddress: e.target.value })}
              placeholder="Full address"
              rows={3}
              className={cn(
                "flex min-h-22 w-full rounded-lg border border-input/90 bg-background/80 px-3.5 py-2 text-base shadow-sm transition-[border-color,box-shadow,background-color] duration-200 md:text-[0.9375rem]",
                "placeholder:text-muted-foreground/65",
                "hover:border-muted-foreground/25 hover:bg-background",
                "focus-visible:border-primary/35 focus-visible:bg-background",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45 focus-visible:ring-offset-0",
                "disabled:cursor-not-allowed disabled:opacity-50"
              )}
            />
          </div>
        </fieldset>

        <fieldset className="grid gap-5 text-left">
          <div className="grid gap-2">
            <Label htmlFor="qg-p2-title">Centre title (optional)</Label>
            <Input
              id="qg-p2-title"
              value={data.page2Title}
              onChange={(e) => patch({ page2Title: e.target.value })}
              placeholder='e.g. QMetry Automation Framework (QAF)- QUOTATION (or leave empty)'
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="qg-desc">Intro line (centred under title)</Label>
            <textarea
              id="qg-desc"
              value={data.description}
              onChange={(e) => patch({ description: e.target.value })}
              placeholder="Below is SecLance quote for conducting QMetry Automation Framework (QAF)."
              rows={3}
              className={cn(
                "flex min-h-22 w-full rounded-lg border border-input/90 bg-background/80 px-3.5 py-2 text-base shadow-sm transition-[border-color,box-shadow,background-color] duration-200 md:text-[0.9375rem]",
                "placeholder:text-muted-foreground/65",
                "hover:border-muted-foreground/25 hover:bg-background",
                "focus-visible:border-primary/35 focus-visible:bg-background",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45 focus-visible:ring-offset-0"
              )}
            />
          </div>

          <div className="space-y-3 rounded-lg border border-border/80 bg-background/60 p-3 dark:bg-background/40">
            <p className="text-sm font-medium text-foreground">Cost table</p>
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="grid gap-2">
                <Label htmlFor="qg-th-detail">Header — left column</Label>
                <Input
                  id="qg-th-detail"
                  value={data.tableHeaderDetail}
                  onChange={(e) => patch({ tableHeaderDetail: e.target.value })}
                  placeholder="Item Description"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="qg-th-cost">Header — right column</Label>
                <Input
                  id="qg-th-cost"
                  value={data.tableHeaderCost}
                  onChange={(e) => patch({ tableHeaderCost: e.target.value })}
                  placeholder="Total"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="qg-currency">Currency Code</Label>
                <Dropdown
                  id="qg-currency"
                  value={data.currency}
                  onChange={(e) => patch({ currency: e.target.value.toUpperCase() })}
                  disabled={isCurrencyLocked}
                  className={cn(isCurrencyLocked && "bg-muted cursor-not-allowed")}
                  options={[...SUPPORTED_CURRENCIES]}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="qg-taxrate">Tax Rate (%)</Label>
                <Input
                  id="qg-taxrate"
                  type="number"
                  min={0}
                  step={1}
                  value={data.taxRate}
                  onChange={(e) => patch({ taxRate: Number(e.target.value) || 0 })}
                  placeholder="5"
                />
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="qg-discount">Discount (Absolute)</Label>
                <Input
                  id="qg-discount"
                  type="number"
                  min={0}
                  step={0.01}
                  value={data.discount}
                  onChange={(e) => patch({ discount: Number(e.target.value) || 0 })}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground">Line Items (Pages)</span>
                <Button type="button" variant="outline" size="sm" onClick={addPage}>
                  <Plus className="size-4 mr-1" />
                  Add page
                </Button>
              </div>

              <div className="space-y-4">
                {data.pages.map((page, pageIndex) => (
                  <div key={pageIndex} className="space-y-2 rounded-lg border border-border/70 bg-muted/15 p-3 dark:bg-muted/10">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold">Page {page.pageNumber}</h4>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => addRow(pageIndex)}>
                          <Plus className="size-3.5 mr-1" />
                          Add row
                        </Button>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          className="text-destructive" 
                          disabled={data.pages.length <= 1}
                          onClick={() => removePage(pageIndex)}
                        >
                          <Trash2 className="size-3.5 mr-1" />
                          Remove Page
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {page.items.map((row, lineIndex) => (
                        <div
                          key={lineIndex}
                          className="grid gap-2 rounded-md border border-border/60 bg-card/90 p-3 sm:grid-cols-[50px_1fr_80px_120px_auto] sm:items-start"
                        >
                          <div className="grid gap-1.5">
                            <Label className="text-[0.65rem] uppercase text-muted-foreground">#</Label>
                            <Input
                              type="number"
                              value={row.number}
                              onChange={(e) => setItem(pageIndex, lineIndex, { number: Number(e.target.value) })}
                              className="px-2"
                            />
                          </div>
                          <div className="grid gap-1.5">
                            <Label className="text-[0.65rem] uppercase text-muted-foreground">Item Name & Desc</Label>
                            <Input
                              value={row.name}
                              onChange={(e) => setItem(pageIndex, lineIndex, { name: e.target.value })}
                              placeholder="Name"
                              className="mb-1"
                            />
                            <textarea
                              value={row.description}
                              onChange={(e) => setItem(pageIndex, lineIndex, { description: e.target.value })}
                              placeholder="Description"
                              rows={2}
                              className={cn(
                                "flex w-full rounded-md border border-input/90 bg-background/80 px-3 py-1.5 text-sm shadow-sm",
                                "focus-visible:border-primary/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45"
                              )}
                            />
                          </div>
                          <div className="grid gap-1.5">
                            <Label className="text-[0.65rem] uppercase text-muted-foreground">Qty</Label>
                            <Input
                              type="number"
                              value={row.quantity}
                              onChange={(e) => setItem(pageIndex, lineIndex, { quantity: Number(e.target.value) })}
                              className="px-2 text-right"
                            />
                          </div>
                          <div className="grid gap-1.5">
                            <Label className="text-[0.65rem] uppercase text-muted-foreground">Unit Price</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={row.price}
                              onChange={(e) => setItem(pageIndex, lineIndex, { price: Number(e.target.value) })}
                              className="px-2 text-right tabular-nums"
                            />
                          </div>
                          <div className="mt-[22px] flex justify-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={page.items.length <= 1}
                              onClick={() => removeRow(pageIndex, lineIndex)}
                              aria-label="Remove row"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="qg-milestone">Payment milestone</Label>
            <textarea
              id="qg-milestone"
              value={data.paymentMilestone}
              onChange={(e) => patch({ paymentMilestone: e.target.value })}
              placeholder="Full payment after report submission."
              rows={3}
              className={cn(
                "flex min-h-20 w-full rounded-lg border border-input/90 bg-background/90 px-3.5 py-2 text-base shadow-sm md:text-[0.9375rem]",
                "placeholder:text-muted-foreground/65",
                "focus-visible:border-primary/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45"
              )}
            />
          </div>
        </fieldset>

        <fieldset className="grid gap-4 text-left">
          <div className="grid gap-2">
            <Label htmlFor="qg-p3-title">Contact section heading</Label>
            <Input
              id="qg-p3-title"
              value={data.page3Title}
              onChange={(e) => patch({ page3Title: e.target.value })}
              placeholder="Contact Details"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="qg-contact-name">Contact name</Label>
            <Input
              id="qg-contact-name"
              value={data.contactName}
              onChange={(e) => patch({ contactName: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="qg-phone">Phone</Label>
            <Input
              id="qg-phone"
              value={data.contactPhone}
              onChange={(e) => patch({ contactPhone: e.target.value })}
              className="tabular-nums"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="qg-email">Email</Label>
            <Input
              id="qg-email"
              type="email"
              value={data.contactEmail}
              onChange={(e) => patch({ contactEmail: e.target.value })}
            />
          </div>
        </fieldset>

        <fieldset className="grid gap-3 text-left">
          <p className="text-[0.8125rem] font-medium text-muted-foreground">Design & layout</p>
          <details className="rounded-lg border border-border/80 bg-background/60 p-3 dark:bg-background/40">
            <summary className="cursor-pointer text-sm font-medium text-foreground">
              Advanced options (alignment, colors, table style)
            </summary>
            <div className="mt-3 grid gap-4">
              <div className="grid gap-3 rounded-lg border border-border/70 bg-background/70 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Page setup
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="qg-page-format">Paper format</Label>
                    <Dropdown
                      id="qg-page-format"
                      value={data.pageFormat}
                      onChange={(e) =>
                        patch({ pageFormat: e.target.value as QuotationData["pageFormat"] })
                      }
                      className="h-10 rounded-lg border-input/90 bg-background text-sm"
                      options={[
                        { value: "a4", label: "A4" },
                        { value: "letter", label: "Letter" },
                      ]}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="qg-page-orientation">Orientation</Label>
                    <Dropdown
                      id="qg-page-orientation"
                      value={data.pageOrientation}
                      onChange={(e) =>
                        patch({
                          pageOrientation:
                            e.target.value as QuotationData["pageOrientation"],
                        })
                      }
                      className="h-10 rounded-lg border-input/90 bg-background text-sm"
                      options={[
                        { value: "landscape", label: "Landscape" },
                        { value: "portrait", label: "Portrait" },
                      ]}
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-3 rounded-lg border border-border/70 bg-background/70 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Text alignment
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="qg-logo-align">Logo position (all pages)</Label>
                    <Dropdown
                      id="qg-logo-align"
                      value={data.logoAlign}
                      onChange={(e) =>
                        patch({ logoAlign: e.target.value as QuotationData["logoAlign"] })
                      }
                      className="h-10 rounded-lg border-input/90 bg-background text-sm"
                      options={[
                        { value: "left", label: "Left" },
                        { value: "center", label: "Center" },
                        { value: "right", label: "Right" },
                      ]}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="qg-table-block-align">Page 2 — cost table block</Label>
                    <Dropdown
                      id="qg-table-block-align"
                      value={data.tableBlockAlign}
                      onChange={(e) =>
                        patch({
                          tableBlockAlign: e.target.value as QuotationData["tableBlockAlign"],
                        })
                      }
                      className="h-10 rounded-lg border-input/90 bg-background text-sm"
                      options={[
                        { value: "left", label: "Left" },
                        { value: "center", label: "Center" },
                        { value: "right", label: "Right" },
                      ]}
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="grid gap-2">
                    <Label htmlFor="qg-align-cover">Cover</Label>
                    <Dropdown
                      id="qg-align-cover"
                      value={data.coverTextAlign}
                      onChange={(e) =>
                        patch({ coverTextAlign: e.target.value as QuotationData["coverTextAlign"] })
                      }
                      className="h-10 rounded-lg border-input/90 bg-background text-sm"
                      options={[
                        { value: "left", label: "Left" },
                        { value: "center", label: "Center" },
                        { value: "right", label: "Right" },
                      ]}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="qg-align-page2">Page 2 title/intro</Label>
                    <Dropdown
                      id="qg-align-page2"
                      value={data.page2TextAlign}
                      onChange={(e) =>
                        patch({ page2TextAlign: e.target.value as QuotationData["page2TextAlign"] })
                      }
                      className="h-10 rounded-lg border-input/90 bg-background text-sm"
                      options={[
                        { value: "left", label: "Left" },
                        { value: "center", label: "Center" },
                        { value: "right", label: "Right" },
                      ]}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="qg-align-contact">Contact block</Label>
                    <Dropdown
                      id="qg-align-contact"
                      value={data.contactTextAlign}
                      onChange={(e) =>
                        patch({
                          contactTextAlign: e.target.value as QuotationData["contactTextAlign"],
                        })
                      }
                      className="h-10 rounded-lg border-input/90 bg-background text-sm"
                      options={[
                        { value: "left", label: "Left" },
                        { value: "center", label: "Center" },
                        { value: "right", label: "Right" },
                      ]}
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-3 rounded-lg border border-border/70 bg-background/70 p-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={data.useDecorShapes}
                    onChange={(e) => patch({ useDecorShapes: e.target.checked })}
                    className="size-4 rounded border-input"
                  />
                  Show left ribbon design
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={data.useGradientBackground}
                    onChange={(e) => patch({ useGradientBackground: e.target.checked })}
                    className="size-4 rounded border-input"
                    disabled={Boolean(data.backgroundImage)}
                  />
                  Use gradient background (disable for flat color)
                </label>
                <div className="grid gap-2">
                  <UploadCard
                    label="Custom background image"
                    value={data.backgroundImage}
                    onChange={(val) => patch({ backgroundImage: val || undefined })}
                    placeholder="PNG, JPG, WebP"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="qg-bg">Background</Label>
                    <Input
                      id="qg-bg"
                      type="color"
                      value={data.bgColor}
                      onChange={(e) => patch({ bgColor: e.target.value })}
                      className="h-10 cursor-pointer p-1"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="qg-accent">Accent</Label>
                    <Input
                      id="qg-accent"
                      type="color"
                      value={data.accentColor}
                      onChange={(e) => patch({ accentColor: e.target.value })}
                      className="h-10 cursor-pointer p-1"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={data.tableUseAccentPreset}
                    onChange={(e) => patch({ tableUseAccentPreset: e.target.checked })}
                    className="size-4 rounded border-input"
                  />
                  Table style follows accent color preset
                </label>
                {!data.tableUseAccentPreset ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="grid gap-2">
                      <Label htmlFor="qg-table-head">Table header</Label>
                      <Input
                        id="qg-table-head"
                        type="color"
                        value={data.tableHeaderBg}
                        onChange={(e) => patch({ tableHeaderBg: e.target.value })}
                        className="h-10 cursor-pointer p-1"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="qg-table-body">Table body</Label>
                      <Input
                        id="qg-table-body"
                        type="color"
                        value={data.tableBodyBg}
                        onChange={(e) => patch({ tableBodyBg: e.target.value })}
                        className="h-10 cursor-pointer p-1"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="qg-table-border">Table border</Label>
                      <Input
                        id="qg-table-border"
                        type="color"
                        value={data.tableBorderColor}
                        onChange={(e) => patch({ tableBorderColor: e.target.value })}
                        className="h-10 cursor-pointer p-1"
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </details>
        </fieldset>
      </CardContent>
    </Card>
  );
}
