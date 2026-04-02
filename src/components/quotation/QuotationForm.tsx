"use client";

import { ImageUp, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils/cn";
import type { QuotationData, QuotationItem } from "@/types/quotation-generator";

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
}: QuotationFormProps) {
  const patch = (partial: Partial<QuotationData>) => {
    onChange({ ...data, ...partial });
  };

  const setItem = (index: number, partial: Partial<QuotationItem>) => {
    const items = data.items.map((row, i) =>
      i === index ? { ...row, ...partial } : row
    );
    patch({ items });
  };

  const addRow = () => {
    patch({ items: [...data.items, { detail: "", cost: "" }] });
  };

  const removeRow = (index: number) => {
    if (data.items.length <= 1) return;
    patch({ items: data.items.filter((_, i) => i !== index) });
  };

  const onLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      patch({ logo: reader.result as string });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const clearLogo = () => patch({ logo: undefined });

  const onBackgroundChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      patch({ backgroundImage: reader.result as string });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const clearBackground = () => patch({ backgroundImage: undefined });

  return (
    <Card className="mx-auto w-full max-w-4xl shrink-0 border-border/80 shadow-md">
      <CardHeader className="space-y-1">
        <CardTitle>{formTitle}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <fieldset className="grid gap-3 rounded-xl border border-border/80 bg-muted/25 p-4 text-left dark:bg-muted/15">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-background text-ring ring-1 ring-border/80">
              <ImageUp className="size-4 opacity-80" aria-hidden />
            </span>
            <div className="min-w-0 flex-1 space-y-2 text-left">
              <Label htmlFor="qg-logo">Upload logo</Label>
              <Input
                id="qg-logo"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml,image/*"
                onChange={onLogoChange}
                className="cursor-pointer file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
              />
              {data.logo ? (
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={data.logo}
                    alt="Logo preview"
                    className="h-14 w-auto max-w-50 object-contain"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={clearLogo}>
                    Remove logo
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
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
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="qg-th-detail">Header — left column</Label>
                <Input
                  id="qg-th-detail"
                  value={data.tableHeaderDetail}
                  onChange={(e) => patch({ tableHeaderDetail: e.target.value })}
                  placeholder="Details"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="qg-th-cost">Header — right column</Label>
                <Input
                  id="qg-th-cost"
                  value={data.tableHeaderCost}
                  onChange={(e) => patch({ tableHeaderCost: e.target.value })}
                  placeholder="Total Cost (USD)"
                />
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <span className="text-sm font-medium text-foreground">Table rows</span>
                <Button type="button" variant="outline" size="sm" onClick={addRow}>
                  <Plus className="size-4" />
                  Add row
                </Button>
              </div>
              <div className="hidden gap-2 px-3 pb-0.5 text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground sm:grid sm:grid-cols-[1fr_120px_auto]">
                <span>Details (left cell)</span>
                <span className="text-right">Total cost (USD)</span>
                <span />
              </div>
              <div className="space-y-2 rounded-lg border border-border/70 bg-muted/15 p-2 dark:bg-muted/10">
                {data.items.map((row, index) => (
                  <div
                    key={index}
                    className="grid gap-3 rounded-md border border-border/60 bg-card/90 p-3 sm:grid-cols-[1fr_120px_auto] sm:items-end"
                  >
                    <div className="grid gap-1.5">
                      <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground sm:hidden">
                        Details (left)
                      </span>
                      <Input
                        aria-label={`Row ${index + 1} — details`}
                        value={row.detail}
                        onChange={(e) => setItem(index, { detail: e.target.value })}
                        placeholder="e.g. QMetry Automation Framework (QAF)"
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground sm:hidden">
                        Total cost (USD)
                      </span>
                      <Input
                        aria-label={`Row ${index + 1} — amount`}
                        value={row.cost}
                        onChange={(e) => setItem(index, { cost: e.target.value })}
                        placeholder="e.g. 5,000.00"
                        className="tabular-nums text-right"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="justify-self-end sm:justify-self-center"
                      disabled={data.items.length <= 1}
                      onClick={() => removeRow(index)}
                      aria-label={`Remove row ${index + 1}`}
                    >
                      <Trash2 className="size-4" />
                    </Button>
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
                    <select
                      id="qg-page-format"
                      value={data.pageFormat}
                      onChange={(e) =>
                        patch({ pageFormat: e.target.value as QuotationData["pageFormat"] })
                      }
                      className="h-10 rounded-lg border border-input/90 bg-background px-3 text-sm"
                    >
                      <option value="a4">A4</option>
                      <option value="letter">Letter</option>
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="qg-page-orientation">Orientation</Label>
                    <select
                      id="qg-page-orientation"
                      value={data.pageOrientation}
                      onChange={(e) =>
                        patch({
                          pageOrientation:
                            e.target.value as QuotationData["pageOrientation"],
                        })
                      }
                      className="h-10 rounded-lg border border-input/90 bg-background px-3 text-sm"
                    >
                      <option value="landscape">Landscape</option>
                      <option value="portrait">Portrait</option>
                    </select>
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
                    <select
                      id="qg-logo-align"
                      value={data.logoAlign}
                      onChange={(e) =>
                        patch({ logoAlign: e.target.value as QuotationData["logoAlign"] })
                      }
                      className="h-10 rounded-lg border border-input/90 bg-background px-3 text-sm"
                    >
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="qg-table-block-align">Page 2 — cost table block</Label>
                    <select
                      id="qg-table-block-align"
                      value={data.tableBlockAlign}
                      onChange={(e) =>
                        patch({
                          tableBlockAlign: e.target.value as QuotationData["tableBlockAlign"],
                        })
                      }
                      className="h-10 rounded-lg border border-input/90 bg-background px-3 text-sm"
                    >
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="grid gap-2">
                    <Label htmlFor="qg-align-cover">Cover</Label>
                    <select
                      id="qg-align-cover"
                      value={data.coverTextAlign}
                      onChange={(e) =>
                        patch({ coverTextAlign: e.target.value as QuotationData["coverTextAlign"] })
                      }
                      className="h-10 rounded-lg border border-input/90 bg-background px-3 text-sm"
                    >
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="qg-align-page2">Page 2 title/intro</Label>
                    <select
                      id="qg-align-page2"
                      value={data.page2TextAlign}
                      onChange={(e) =>
                        patch({ page2TextAlign: e.target.value as QuotationData["page2TextAlign"] })
                      }
                      className="h-10 rounded-lg border border-input/90 bg-background px-3 text-sm"
                    >
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="qg-align-contact">Contact block</Label>
                    <select
                      id="qg-align-contact"
                      value={data.contactTextAlign}
                      onChange={(e) =>
                        patch({
                          contactTextAlign: e.target.value as QuotationData["contactTextAlign"],
                        })
                      }
                      className="h-10 rounded-lg border border-input/90 bg-background px-3 text-sm"
                    >
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>
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
                  <Label htmlFor="qg-bg-image">Custom background image</Label>
                  <Input
                    id="qg-bg-image"
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/*"
                    onChange={onBackgroundChange}
                    className="cursor-pointer file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
                  />
                  {data.backgroundImage ? (
                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={data.backgroundImage}
                        alt="Background preview"
                        className="h-16 w-auto max-w-60 rounded-lg border border-border bg-background object-cover p-1"
                      />
                      <Button type="button" variant="outline" size="sm" onClick={clearBackground}>
                        Remove background
                      </Button>
                    </div>
                  ) : null}
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

        <div className="sticky bottom-0 z-10 -mx-5 flex flex-wrap items-center gap-2 border-t border-border/80 bg-card/95 px-5 pb-2 pt-3 backdrop-blur supports-backdrop-filter:bg-card/80">
          {onCancelEdit ? (
            <Button type="button" variant="ghost" onClick={onCancelEdit}>
              Cancel
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={onReset}>
            Reset form
          </Button>
          <Button type="button" variant="secondary" onClick={onSaveQuotation}>
            <Save className="size-4" aria-hidden />
            Save quotation
          </Button>
          <Button type="button" onClick={onDownloadPdf} disabled={exporting}>
            {exporting ? "Building PDF…" : "Download PDF"}
          </Button>
          {saveNotice ? (
            <span className="text-muted-foreground w-full text-sm sm:ml-1 sm:w-auto" role="status">
              {saveNotice}
            </span>
          ) : null}
          {pdfError ? (
            <p
              className="text-destructive w-full text-sm sm:ml-1 sm:w-auto"
              role="alert"
            >
              {pdfError}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
