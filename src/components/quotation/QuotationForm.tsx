"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ImageUp, Plus, Save, Trash2, Sparkles, Building2, CheckCircle2, Lock, Unlock, RotateCcw, Edit2 } from "lucide-react";
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


import { generateStandardDocumentRef, resolveCompanyCode, generateRandomSuffix } from "@/lib/utils/document-reference";

function resolveCompanyPrefix(comp: any, docType: string = "QT"): string {
  return resolveCompanyCode(comp, docType);
}

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
  const [activeCompany, setActiveCompany] = useState<any | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [autoFillNotice, setAutoFillNotice] = useState<string | null>(null);
  const [scopeMode, setScopeMode] = useState<"single" | "group">("single");

  const dataRef = useRef(data);
  dataRef.current = data;

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const patch = useCallback((partial: Partial<QuotationData>) => {
    onChangeRef.current({ ...dataRef.current, ...partial });
  }, []);

  const syncCompanyContext = useCallback(async () => {
    const scope = (localStorage.getItem("scopeMode") as "single" | "group") || "single";
    const activeCompanyId = localStorage.getItem("activeCompanyId") || "";
    setScopeMode(scope);

    try {
      const queryParams = new URLSearchParams();
      if (activeCompanyId) queryParams.set("companyId", activeCompanyId);
      queryParams.set("scopeMode", scope);

      const res = await fetch(`/api/admin/company?${queryParams.toString()}`);
      if (!res.ok) return;
      const json = await res.json();
      if (json.item) {
        const comp = json.item;
        setActiveCompany(comp);

        // If company data is NOT manually edited by user, auto-sync from active company context
        if (!dataRef.current.isCompanyDataEdited) {
          const compCode = resolveCompanyPrefix(comp);

          const now = new Date();
          const yy = now.getFullYear().toString().slice(-2);
          const mm = String(now.getMonth() + 1).padStart(2, "0");
          const dd = String(now.getDate()).padStart(2, "0");
          const shortDate = `${yy}${mm}${dd}`;

          const seqNum = json.nextQuotationSeq ? String(json.nextQuotationSeq).padStart(3, "0") : "001";
          const randomSuffix = generateRandomSuffix(3);

          const generatedRef = `QT-${compCode}-${shortDate}-${seqNum}-${randomSuffix}`;

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
            logo: comp.branding?.logoUrl || comp.logoUrl || dataRef.current.logo,
            currency: comp.baseCurrency || dataRef.current.currency || "AED",
            refNo: dataRef.current.isRefNoEdited && dataRef.current.refNo ? dataRef.current.refNo : generatedRef,
            contactName: comp.contactName || dataRef.current.contactName,
            contactEmail: comp.email || dataRef.current.contactEmail,
            contactPhone: comp.phone || dataRef.current.contactPhone,
            paymentMilestone: comp.branding?.invoiceFooter || comp.invoiceFooter || dataRef.current.paymentMilestone,
            isCompanyDataEdited: false,
          });
        }
      }
    } catch (err) {
      console.error("Failed to auto-load active company details:", err);
    }
  }, [patch]);

  useEffect(() => {
    syncCompanyContext();

    const scope = (localStorage.getItem("scopeMode") as "single" | "group") || "single";
    if (scope === "group") {
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

    const handleContextChange = () => {
      syncCompanyContext();
    };
    window.addEventListener("companyContextChanged", handleContextChange);
    return () => window.removeEventListener("companyContextChanged", handleContextChange);
  }, [syncCompanyContext]);

  const handleResetCompanyToContext = () => {
    if (!activeCompany) return;
    const comp = activeCompany;
    const compCode = resolveCompanyPrefix(comp);
    const now = new Date();
    const yy = now.getFullYear().toString().slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const shortDate = `${yy}${mm}${dd}`;
    const randomSuffix = generateRandomSuffix(3);
    const generatedRef = `QT-${compCode}-${shortDate}-001-${randomSuffix}`;

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
      paymentMilestone: comp.branding?.invoiceFooter || comp.invoiceFooter || data.paymentMilestone,
      isCompanyDataEdited: false,
    });
    setAutoFillNotice(`Reset company details to active company "${comp.name}"`);
    setTimeout(() => setAutoFillNotice(null), 3500);
  };

  const handleAutoFillCompany = (companyId: string) => {
    setSelectedCompanyId(companyId);
    if (!companyId) return;

    const comp = companies.find((c) => c._id === companyId);
    if (!comp) return;

    const compCode = resolveCompanyPrefix(comp);
    const now = new Date();
    const yy = now.getFullYear().toString().slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const shortDate = `${yy}${mm}${dd}`;
    const randomSuffix = generateRandomSuffix(3);
    const generatedRef = `QT-${compCode}-${shortDate}-001-${randomSuffix}`;

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
      isCompanyDataEdited: false,
    });

    setAutoFillNotice(`Auto-filled details & branding from "${comp.name}" (${comp.code})`);
    setTimeout(() => setAutoFillNotice(null), 4500);
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
              <div className="flex items-center justify-between">
                <Label htmlFor="qg-quotation-no" className="flex items-center gap-1.5">
                  Quotation no
                  {!data.isRefNoEdited ? (
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <Lock className="h-3 w-3" /> (Auto-generated)
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <Edit2 className="h-3 w-3" /> (Custom)
                    </span>
                  )}
                </Label>
                {!data.isRefNoEdited ? (
                  <button
                    type="button"
                    onClick={() => patch({ isRefNoEdited: true })}
                    className="text-xs text-primary underline-offset-2 hover:underline flex items-center gap-1"
                  >
                    <Unlock className="h-3 w-3" /> Unlock to edit
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      const compCode = resolveCompanyPrefix(activeCompany);
                      const now = new Date();
                      const yy = now.getFullYear().toString().slice(-2);
                      const mm = String(now.getMonth() + 1).padStart(2, "0");
                      const dd = String(now.getDate()).padStart(2, "0");
                      const shortDate = `${yy}${mm}${dd}`;
                      const randomSuffix = generateRandomSuffix(3);

                      patch({ refNo: `QT-${compCode}-${shortDate}-001-${randomSuffix}`, isRefNoEdited: false });
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    <RotateCcw className="h-3 w-3" /> Reset / Lock
                  </button>
                )}
              </div>
              {(() => {
                const activeCompCode = resolveCompanyPrefix(activeCompany);
                const fixedPrefix = `QT-${activeCompCode}-`;

                const currentRef = data.refNo || "";
                let displaySuffix = currentRef;

                if (currentRef.startsWith(fixedPrefix)) {
                  displaySuffix = currentRef.slice(fixedPrefix.length);
                } else if (currentRef.startsWith("QT-")) {
                  const secondDash = currentRef.indexOf("-", 3);
                  if (secondDash !== -1) {
                    displaySuffix = currentRef.slice(secondDash + 1);
                  }
                }

                const isValidFormat = /^QT-[A-Z0-9]{3,5}-[0-9]{6}-[0-9]{3,4}-[A-Z0-9]{3,4}$/i.test(currentRef);

                return (
                  <div className="space-y-1">
                    <div className="flex items-center rounded-xl overflow-hidden border border-input focus-within:ring-2 focus-within:ring-ring transition-all">
                      <div className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-r border-emerald-500/30 px-3 py-2 text-xs font-mono font-bold flex items-center gap-1 select-none shrink-0">
                        <Lock className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                        <span>{fixedPrefix}</span>
                      </div>

                      <input
                        id="qg-quotation-no"
                        value={displaySuffix}
                        readOnly={!data.isRefNoEdited}
                        onChange={(e) => {
                          const inputVal = e.target.value;
                          patch({ refNo: `${fixedPrefix}${inputVal}`, isRefNoEdited: true });
                        }}
                        placeholder="260814-001-K9X"
                        className={cn(
                          "flex-1 bg-background px-3 py-2 text-sm font-mono focus:outline-none min-w-0",
                          !data.isRefNoEdited && "bg-muted/30 text-muted-foreground cursor-not-allowed"
                        )}
                      />

                      {!data.isRefNoEdited && (
                        <div className="px-3 flex items-center bg-muted/30">
                          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">LOCKED</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between px-1">
                      <span className="text-[11px] text-muted-foreground font-mono">
                        Full Ref: <strong className="text-foreground">{data.refNo}</strong>
                      </span>
                      {data.isRefNoEdited && (
                        <span className={cn("text-[10px] font-semibold flex items-center gap-1", isValidFormat ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")}>
                          {isValidFormat ? "✓ Standard Format" : "⚠ Custom Suffix"}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}
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

          {/* Company Lock State & Context Banner */}
          <div className={cn(
            "rounded-xl border p-3.5 grid gap-2 transition-all shadow-xs",
            data.isCompanyDataEdited
              ? "border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10"
              : "border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10"
          )}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold text-foreground">Issuing Entity Context</span>
                {data.isCompanyDataEdited ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full">
                    <Unlock className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                    Customized / Edited Data
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                    <Lock className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                    Locked to Context ({activeCompany?.name || data.companyName || "Active Corporate Unit"})
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {autoFillNotice && (
                  <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-in fade-in-50">
                    <CheckCircle2 className="h-3.5 w-3.5" /> {autoFillNotice}
                  </span>
                )}
                {data.isCompanyDataEdited ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleResetCompanyToContext}
                    className="h-7 text-xs gap-1.5 border-border bg-background hover:bg-muted"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Reset to Company Context
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => patch({ isCompanyDataEdited: true })}
                    className="h-7 text-xs gap-1.5 border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
                  >
                    <Unlock className="h-3 w-3" />
                    Unlock & Edit Company Data
                  </Button>
                )}
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground leading-normal">
              {data.isCompanyDataEdited
                ? "This quotation uses custom/edited company details. Click 'Reset to Company Context' to re-lock and sync with active context."
                : "Company details are locked to your active company context. Switch active company from navbar to issue for another company, or unlock to customize."}
            </p>

            {scopeMode === "group" && companies.length > 0 && (
              <div className="mt-2 border-t border-border/40 pt-2 grid gap-1.5">
                <Label htmlFor="company-autofill-select" className="text-xs font-semibold text-primary flex items-center gap-1.5">
                  Group View: Switch Entity for this Quotation
                </Label>
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
            )}
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="qg-company" className="flex items-center gap-1.5">
                Company name
                {!data.isCompanyDataEdited ? (
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Lock className="h-3 w-3" /> (Locked)
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <Edit2 className="h-3 w-3" /> (Custom)
                  </span>
                )}
              </Label>
              {!data.isCompanyDataEdited && (
                <button
                  type="button"
                  onClick={() => patch({ isCompanyDataEdited: true })}
                  className="text-xs text-primary underline-offset-2 hover:underline flex items-center gap-1"
                >
                  <Unlock className="h-3 w-3" /> Unlock to edit
                </button>
              )}
            </div>
            <div className="relative">
              <Input
                id="qg-company"
                value={data.companyName}
                readOnly={!data.isCompanyDataEdited}
                onChange={(e) => patch({ companyName: e.target.value, isCompanyDataEdited: true })}
                placeholder="Your company"
                className={cn(
                  !data.isCompanyDataEdited && "bg-muted/50 font-medium text-foreground cursor-not-allowed border-emerald-500/30"
                )}
              />
              {!data.isCompanyDataEdited && (
                <Lock className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
              )}
            </div>
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="qg-address" className="flex items-center gap-1.5">
                Company address
                {!data.isCompanyDataEdited ? (
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Lock className="h-3 w-3" /> (Locked)
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <Edit2 className="h-3 w-3" /> (Custom)
                  </span>
                )}
              </Label>
              {!data.isCompanyDataEdited && (
                <button
                  type="button"
                  onClick={() => patch({ isCompanyDataEdited: true })}
                  className="text-xs text-primary underline-offset-2 hover:underline flex items-center gap-1"
                >
                  <Unlock className="h-3 w-3" /> Unlock to edit
                </button>
              )}
            </div>
            <div className="relative">
              <textarea
                id="qg-address"
                value={data.companyAddress}
                readOnly={!data.isCompanyDataEdited}
                onChange={(e) => patch({ companyAddress: e.target.value, isCompanyDataEdited: true })}
                placeholder="Full address"
                rows={3}
                className={cn(
                  "flex min-h-22 w-full rounded-lg border border-input/90 bg-background/80 px-3.5 py-2 text-base shadow-sm transition-[border-color,box-shadow,background-color] duration-200 md:text-[0.9375rem]",
                  "placeholder:text-muted-foreground/65",
                  "hover:border-muted-foreground/25 hover:bg-background",
                  "focus-visible:border-primary/35 focus-visible:bg-background",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45 focus-visible:ring-offset-0",
                  !data.isCompanyDataEdited && "bg-muted/50 font-medium text-foreground cursor-not-allowed border-emerald-500/30"
                )}
              />
              {!data.isCompanyDataEdited && (
                <Lock className="absolute right-3 top-3 h-4 w-4 text-muted-foreground/60" />
              )}
            </div>
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
            <div className="flex items-center justify-between">
              <Label htmlFor="qg-milestone" className="flex items-center gap-1.5">
                Payment milestone
                {!data.isCompanyDataEdited ? (
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Lock className="h-3 w-3" /> (Locked)
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <Edit2 className="h-3 w-3" /> (Custom)
                  </span>
                )}
              </Label>
              {!data.isCompanyDataEdited && (
                <button
                  type="button"
                  onClick={() => patch({ isCompanyDataEdited: true })}
                  className="text-xs text-primary underline-offset-2 hover:underline flex items-center gap-1"
                >
                  <Unlock className="h-3 w-3" /> Unlock to edit
                </button>
              )}
            </div>
            <div className="relative">
              <textarea
                id="qg-milestone"
                value={data.paymentMilestone}
                readOnly={!data.isCompanyDataEdited}
                onChange={(e) => patch({ paymentMilestone: e.target.value, isCompanyDataEdited: true })}
                placeholder="Full payment after report submission."
                rows={3}
                className={cn(
                  "flex min-h-20 w-full rounded-lg border border-input/90 bg-background/90 px-3.5 py-2 text-base shadow-sm md:text-[0.9375rem]",
                  "placeholder:text-muted-foreground/65",
                  "focus-visible:border-primary/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45",
                  !data.isCompanyDataEdited && "bg-muted/50 font-medium text-foreground cursor-not-allowed border-emerald-500/30"
                )}
              />
              {!data.isCompanyDataEdited && (
                <Lock className="absolute right-3 top-3 h-4 w-4 text-muted-foreground/60" />
              )}
            </div>
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
            <div className="flex items-center justify-between">
              <Label htmlFor="qg-contact-name" className="flex items-center gap-1.5">
                Contact name
                {!data.isCompanyDataEdited ? (
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Lock className="h-3 w-3" /> (Locked)
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <Edit2 className="h-3 w-3" /> (Custom)
                  </span>
                )}
              </Label>
              {!data.isCompanyDataEdited && (
                <button
                  type="button"
                  onClick={() => patch({ isCompanyDataEdited: true })}
                  className="text-xs text-primary underline-offset-2 hover:underline flex items-center gap-1"
                >
                  <Unlock className="h-3 w-3" /> Unlock to edit
                </button>
              )}
            </div>
            <div className="relative">
              <Input
                id="qg-contact-name"
                value={data.contactName}
                readOnly={!data.isCompanyDataEdited}
                onChange={(e) => patch({ contactName: e.target.value, isCompanyDataEdited: true })}
                className={cn(
                  !data.isCompanyDataEdited && "bg-muted/50 font-medium text-foreground cursor-not-allowed border-emerald-500/30"
                )}
              />
              {!data.isCompanyDataEdited && (
                <Lock className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
              )}
            </div>
          </div>
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="qg-phone" className="flex items-center gap-1.5">
                Phone
                {!data.isCompanyDataEdited ? (
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Lock className="h-3 w-3" /> (Locked)
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <Edit2 className="h-3 w-3" /> (Custom)
                  </span>
                )}
              </Label>
              {!data.isCompanyDataEdited && (
                <button
                  type="button"
                  onClick={() => patch({ isCompanyDataEdited: true })}
                  className="text-xs text-primary underline-offset-2 hover:underline flex items-center gap-1"
                >
                  <Unlock className="h-3 w-3" /> Unlock to edit
                </button>
              )}
            </div>
            <div className="relative">
              <Input
                id="qg-phone"
                value={data.contactPhone}
                readOnly={!data.isCompanyDataEdited}
                onChange={(e) => patch({ contactPhone: e.target.value, isCompanyDataEdited: true })}
                className={cn(
                  "tabular-nums",
                  !data.isCompanyDataEdited && "bg-muted/50 font-medium text-foreground cursor-not-allowed border-emerald-500/30"
                )}
              />
              {!data.isCompanyDataEdited && (
                <Lock className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
              )}
            </div>
          </div>
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="qg-email" className="flex items-center gap-1.5">
                Email
                {!data.isCompanyDataEdited ? (
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Lock className="h-3 w-3" /> (Locked)
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <Edit2 className="h-3 w-3" /> (Custom)
                  </span>
                )}
              </Label>
              {!data.isCompanyDataEdited && (
                <button
                  type="button"
                  onClick={() => patch({ isCompanyDataEdited: true })}
                  className="text-xs text-primary underline-offset-2 hover:underline flex items-center gap-1"
                >
                  <Unlock className="h-3 w-3" /> Unlock to edit
                </button>
              )}
            </div>
            <div className="relative">
              <Input
                id="qg-email"
                type="email"
                value={data.contactEmail}
                readOnly={!data.isCompanyDataEdited}
                onChange={(e) => patch({ contactEmail: e.target.value, isCompanyDataEdited: true })}
                className={cn(
                  !data.isCompanyDataEdited && "bg-muted/50 font-medium text-foreground cursor-not-allowed border-emerald-500/30"
                )}
              />
              {!data.isCompanyDataEdited && (
                <Lock className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
              )}
            </div>
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
