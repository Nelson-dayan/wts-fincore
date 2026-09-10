"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Landmark,
  Loader2,
  Save,
  ShieldCheck,
  FileText,
  CreditCard,
  Phone,
  Mail,
  Globe,
  MapPin,
  CheckCircle2,
  Sparkles,
  Network,
} from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dropdown } from "@/components/ui/select";
import { UploadCard } from "@/components/ui/upload-card";
import { readResponseJson } from "@/lib/http/read-response-json";
import { isImageSrc } from "@/lib/utils/is-image-src";

type CompanyFormData = {
  _id?: string;
  name: string;
  code: string;
  kind: "holding" | "operating" | "branch" | "division";
  taxId: string;
  baseCurrency: string;
  address: string;
  email: string;
  phone: string;
  website: string;
  contactName: string;
  isPrimary: boolean;
  logoUrl: string;
  logoText: string;
  signatureUrl: string;
  signatureText: string;
  companySealUrl: string;
  invoicePrefix: string;
  quotationPrefix: string;
  poPrefix: string;
  invoiceFooter: string;
  bankDetailsText: string;
};

const KIND_OPTIONS = [
  { value: "holding", label: "Parent Entity / Holding" },
  { value: "operating", label: "Operating Subsidiary" },
  { value: "branch", label: "Regional Branch" },
  { value: "division", label: "Business Division" },
];

const CURRENCY_OPTIONS = [
  { value: "AED", label: "AED - UAE Dirham" },
  { value: "USD", label: "USD - US Dollar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "GBP", label: "GBP - British Pound" },
  { value: "SAR", label: "SAR - Saudi Riyal" },
  { value: "INR", label: "INR - Indian Rupee" },
  { value: "AUD", label: "AUD - Australian Dollar" },
];

function s(v: string | undefined | null): string {
  return v ?? "";
}

export function AdminCompanyClient() {
  const router = useRouter();
  const [form, setForm] = useState<CompanyFormData>({
    name: "",
    code: "",
    kind: "operating",
    taxId: "",
    baseCurrency: "AED",
    address: "",
    email: "",
    phone: "",
    website: "",
    contactName: "",
    isPrimary: true,
    logoUrl: "",
    logoText: "",
    signatureUrl: "",
    signatureText: "",
    companySealUrl: "",
    invoicePrefix: "INV-DXB",
    quotationPrefix: "QT-DXB",
    poPrefix: "PO-DXB",
    invoiceFooter: "",
    bankDetailsText: "",
  });

  const [initialForm, setInitialForm] = useState<CompanyFormData>({ ...form });
  const [message, setMessage] = useState("");
  const [messageOk, setMessageOk] = useState(true);
  const [pending, setPending] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [bootError, setBootError] = useState("");
  const [scopeMode, setScopeMode] = useState<"single" | "group">("single");

  const isChanged = JSON.stringify(form) !== JSON.stringify(initialForm);

  async function loadPrimary(opts?: { quiet?: boolean }) {
    const currentScope = (localStorage.getItem("scopeMode") as "single" | "group") || "single";
    setScopeMode(currentScope);

    if (!opts?.quiet) {
      setLoadingInitial(true);
      setBootError("");
    }
    try {
      const primaryRes = await fetch("/api/admin/company", { cache: "no-store" });
      const primaryPayload = await readResponseJson<{ item?: any; message?: string }>(
        primaryRes
      );
      if (!primaryRes.ok) throw new Error(primaryPayload.message ?? "Failed to load company");
      if (primaryPayload.item) {
        const item = primaryPayload.item;
        const b = item.branding || {};

        const logoImg = [b.logoUrl, item.logoText, b.logoText].find((val) => typeof val === "string" && isImageSrc(val)) || "";
        const sigImg = [b.signatureUrl, item.signatureText, b.signatureText].find((val) => typeof val === "string" && isImageSrc(val)) || "";
        const sealImg = isImageSrc(b.companySealUrl) ? b.companySealUrl : "";

        const loaded: CompanyFormData = {
          _id: item._id,
          name: item.name ?? "",
          code: item.code ?? "SDT-DXB",
          kind: item.kind ?? "operating",
          taxId: item.taxId ?? "",
          baseCurrency: item.baseCurrency ?? "AED",
          address: item.address ?? "",
          email: item.email ?? "",
          phone: item.phone ?? "",
          website: item.website ?? "",
          contactName: item.contactName ?? "",
          isPrimary: item.isPrimary ?? true,
          logoUrl: logoImg,
          logoText: logoImg,
          signatureUrl: sigImg,
          signatureText: sigImg,
          companySealUrl: sealImg,
          invoicePrefix: b.invoicePrefix ?? `${item.code || "SDT"}-INV`,
          quotationPrefix: b.quotationPrefix ?? `${item.code || "SDT"}-QT`,
          poPrefix: b.poPrefix ?? `${item.code || "SDT"}-PO`,
          invoiceFooter: b.invoiceFooter ?? "",
          bankDetailsText: b.bankDetailsText ?? "",
        };

        setForm(loaded);
        setInitialForm(loaded);
      }
      if (!opts?.quiet) setBootError("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load company";
      if (opts?.quiet) {
        setMessageOk(false);
        setMessage(msg);
      } else {
        setBootError(msg);
      }
    } finally {
      if (!opts?.quiet) setLoadingInitial(false);
    }
  }

  useEffect(() => {
    loadPrimary();

    const handleContextChange = () => {
      loadPrimary();
    };

    window.addEventListener("companyContextChanged", handleContextChange);
    return () => {
      window.removeEventListener("companyContextChanged", handleContextChange);
    };
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setMessage("");

    const payload = {
      ...form,
      logoText: form.logoUrl,
      signatureText: form.signatureUrl,
      branding: {
        logoUrl: form.logoUrl,
        logoText: form.logoUrl,
        signatureUrl: form.signatureUrl,
        signatureText: form.signatureUrl,
        companySealUrl: form.companySealUrl,
        invoicePrefix: form.invoicePrefix,
        quotationPrefix: form.quotationPrefix,
        poPrefix: form.poPrefix,
        invoiceFooter: form.invoiceFooter,
        bankDetailsText: form.bankDetailsText,
      },
    };

    try {
      const response = await fetch("/api/admin/company", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const resData = await readResponseJson<{ message?: string }>(response);
      if (!response.ok) throw new Error(resData.message ?? "Failed to update company settings");
      setMessageOk(true);
      setMessage("Company profile & branding saved successfully.");
      await loadPrimary({ quiet: true });
      router.refresh();
    } catch (e) {
      setMessageOk(false);
      setMessage(e instanceof Error ? e.message : "Failed to update company settings");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="animate-fade-in space-y-8 pb-12">
      <DashboardPageHeader
        title="Company & Enterprise Branding"
        description="Configure primary organization details, legal identifiers, document prefixes, and official brand assets."
      />

      {loadingInitial ? (
        <div className="flex min-h-[450px] items-center justify-center rounded-3xl border border-border/50 bg-background/70 backdrop-blur">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <div className="text-center">
              <h3 className="text-base font-semibold">Loading Primary Entity</h3>
              <p className="text-xs text-muted-foreground">Fetching organizational metadata...</p>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-8">
          {/* TOP HERO BANNER */}
          <div className="relative overflow-hidden rounded-3xl border border-border/50 bg-background p-6 lg:p-8 shadow-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />

            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
                <div className="flex h-20 w-20 sm:h-24 sm:w-24 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-muted/30 shadow-inner overflow-hidden">
                  {isImageSrc(form.logoUrl) ? (
                    <img
                      src={form.logoUrl}
                      alt="Company Logo"
                      className="h-14 w-14 sm:h-16 sm:w-16 object-contain"
                    />
                  ) : (
                    <Building2 className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
                  )}
                </div>

                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <span className="text-[11px] sm:text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                      {form.code || "ENTITY"}
                    </span>
                    <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold text-primary">
                      {form.isPrimary ? "Primary Headquarter" : "Operating Unit"}
                    </span>
                    {scopeMode === "group" ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                        <Network className="h-3 w-3" /> Group View
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                        <Building2 className="h-3 w-3" /> Single Entity Context
                      </span>
                    )}
                  </div>

                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-foreground break-words">
                    {form.name || "Enterprise Headquarter"}
                  </h1>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {form.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{form.email}</span>}
                    {form.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{form.phone}</span>}
                    {form.taxId && <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3" />TRN: {form.taxId}</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {message && (
                  <div
                    className={`rounded-xl border px-3.5 py-2 text-xs font-medium ${
                      messageOk
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "border-destructive/20 bg-destructive/10 text-destructive"
                    }`}
                  >
                    {message}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={pending || !isChanged}
                  size="lg"
                  className="h-12 rounded-xl px-6 text-sm font-semibold shadow-lg shadow-primary/20"
                >
                  {pending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Enterprise Settings
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* MAIN GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* SECTION 1: LEGAL & PRIMARY IDENTITY */}
            <div className="rounded-3xl border border-border/50 bg-background p-6 shadow-sm space-y-6">
              <div className="flex items-center gap-3 border-b border-border/40 pb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">Legal & Enterprise Identity</h3>
                  <p className="text-xs text-muted-foreground">Official registered entity details and classification</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-xs font-medium mb-1.5 block">
                    Company Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    className="h-10 rounded-xl bg-muted/20 text-sm"
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Sec-DocuTrade Middle East FZ-LLC"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-medium mb-1.5 block">
                      Entity Code (3-5 Chars) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      className="h-10 rounded-xl bg-muted/20 text-sm uppercase"
                      value={form.code}
                      maxLength={5}
                      onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5) }))}
                      placeholder="e.g. DXB, HOLD"
                      required
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-medium mb-1.5 block">
                      Entity Kind <span className="text-destructive">*</span>
                    </Label>
                    <Dropdown
                      options={KIND_OPTIONS}
                      value={form.kind}
                      onChange={(val) => setForm((prev) => ({ ...prev, kind: val as any }))}
                      placeholder="Select Entity Kind"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-medium mb-1.5 block">
                      Base Currency <span className="text-destructive">*</span>
                    </Label>
                    <Dropdown
                      options={CURRENCY_OPTIONS}
                      value={form.baseCurrency}
                      onChange={(val) => setForm((prev) => ({ ...prev, baseCurrency: val }))}
                      placeholder="Select Base Currency"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-medium mb-1.5 block">
                      Tax Registration / TRN / VAT ID
                    </Label>
                    <Input
                      className="h-10 rounded-xl bg-muted/20 text-sm"
                      value={form.taxId}
                      onChange={(e) => setForm((prev) => ({ ...prev, taxId: e.target.value }))}
                      placeholder="e.g. 100234567800003"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-border/40">
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={form.isPrimary}
                      onChange={(e) => setForm((prev) => ({ ...prev, isPrimary: e.target.checked }))}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <div>
                      <span className="text-xs font-semibold text-foreground">Set as Primary Headquarter Entity</span>
                      <p className="text-[11px] text-muted-foreground">Default entity for top-level consolidated financial reports.</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* SECTION 2: CONTACT & LOCATION */}
            <div className="rounded-3xl border border-border/50 bg-background p-6 shadow-sm space-y-6">
              <div className="flex items-center gap-3 border-b border-border/40 pb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Globe className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">Contact & Location</h3>
                  <p className="text-xs text-muted-foreground">Official business contact details and headquarters address</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-medium mb-1.5 block">Official Email</Label>
                    <Input
                      type="email"
                      className="h-10 rounded-xl bg-muted/20 text-sm"
                      value={form.email}
                      onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="contact@company.com"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-medium mb-1.5 block">Phone Number</Label>
                    <Input
                      type="text"
                      className="h-10 rounded-xl bg-muted/20 text-sm"
                      value={form.phone}
                      onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                      placeholder="+971 4 123 4567"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-medium mb-1.5 block">Contact Person Name</Label>
                    <Input
                      type="text"
                      className="h-10 rounded-xl bg-muted/20 text-sm"
                      value={form.contactName}
                      onChange={(e) => setForm((prev) => ({ ...prev, contactName: e.target.value }))}
                      placeholder="e.g. John Doe"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-medium mb-1.5 block">Website URL</Label>
                    <Input
                      type="text"
                      className="h-10 rounded-xl bg-muted/20 text-sm"
                      value={form.website}
                      onChange={(e) => setForm((prev) => ({ ...prev, website: e.target.value }))}
                      placeholder="https://company.com"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-medium mb-1.5 block">Official Address</Label>
                  <textarea
                    rows={3}
                    className="w-full rounded-xl border border-border/80 bg-muted/20 p-3 text-sm text-foreground outline-none focus:border-primary"
                    value={form.address}
                    onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                    placeholder="Enter registered physical address or PO Box..."
                  />
                </div>
              </div>
            </div>

            {/* SECTION 3: DOCUMENT PREFIXES & FOOTERS */}
            <div className="rounded-3xl border border-border/50 bg-background p-6 shadow-sm space-y-6">
              <div className="flex items-center gap-3 border-b border-border/40 pb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">Document Prefixes & Terms</h3>
                  <p className="text-xs text-muted-foreground">Standardized document number formats and bank details</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs font-medium mb-1.5 block">Invoice Sub-Prefix (Max 5 Chars)</Label>
                    <Input
                      className="h-10 rounded-xl bg-muted/20 text-sm uppercase"
                      value={form.invoicePrefix}
                      maxLength={5}
                      onChange={(e) => setForm((prev) => ({ ...prev, invoicePrefix: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5) }))}
                      placeholder="INV"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-medium mb-1.5 block">Quotation Sub-Prefix (Max 5 Chars)</Label>
                    <Input
                      className="h-10 rounded-xl bg-muted/20 text-sm uppercase"
                      value={form.quotationPrefix}
                      maxLength={5}
                      onChange={(e) => setForm((prev) => ({ ...prev, quotationPrefix: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5) }))}
                      placeholder="QT"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-medium mb-1.5 block">PO Sub-Prefix (Max 5 Chars)</Label>
                    <Input
                      className="h-10 rounded-xl bg-muted/20 text-sm uppercase"
                      value={form.poPrefix}
                      maxLength={5}
                      onChange={(e) => setForm((prev) => ({ ...prev, poPrefix: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5) }))}
                      placeholder="PO"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-medium mb-1.5 block">Invoice Footer / Terms</Label>
                  <textarea
                    rows={2}
                    className="w-full rounded-xl border border-border/80 bg-muted/20 p-3 text-sm text-foreground outline-none focus:border-primary"
                    value={form.invoiceFooter}
                    onChange={(e) => setForm((prev) => ({ ...prev, invoiceFooter: e.target.value }))}
                    placeholder="Thank you for doing business with us."
                  />
                </div>

                <div>
                  <Label className="text-xs font-medium mb-1.5 block">Bank Details Text</Label>
                  <textarea
                    rows={2}
                    className="w-full rounded-xl border border-border/80 bg-muted/20 p-3 text-sm text-foreground outline-none focus:border-primary font-mono text-xs"
                    value={form.bankDetailsText}
                    onChange={(e) => setForm((prev) => ({ ...prev, bankDetailsText: e.target.value }))}
                    placeholder="Bank Name | IBAN: AE... | BIC: ..."
                  />
                </div>
              </div>
            </div>

            {/* SECTION 4: BRAND ASSETS */}
            <div className="rounded-3xl border border-border/50 bg-background p-6 shadow-sm space-y-6">
              <div className="flex items-center gap-3 border-b border-border/40 pb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">Brand Assets & Stamps</h3>
                  <p className="text-xs text-muted-foreground">Official logos, signatures, and seals rendered on documents</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <UploadCard
                    compact={true}
                    label="Company Logo"
                    value={form.logoUrl}
                    onChange={(val) => setForm((prev) => ({ ...prev, logoUrl: val, logoText: val }))}
                    placeholder="Upload logo (PNG, SVG)"
                  />
                  <div>
                    <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                      Direct Logo URL / Base64
                    </label>
                    <input
                      type="text"
                      value={form.logoUrl}
                      onChange={(e) => setForm((prev) => ({ ...prev, logoUrl: e.target.value, logoText: e.target.value }))}
                      className="w-full rounded-lg border border-border/80 bg-background px-2.5 py-1.5 text-xs text-foreground"
                      placeholder="https://... or data:image..."
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <UploadCard
                    compact={true}
                    label="Authorized Signature"
                    value={form.signatureUrl}
                    onChange={(val) => setForm((prev) => ({ ...prev, signatureUrl: val, signatureText: val }))}
                    placeholder="Upload signature"
                  />
                  <div>
                    <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                      Direct Signature URL / Base64
                    </label>
                    <input
                      type="text"
                      value={form.signatureUrl}
                      onChange={(e) => setForm((prev) => ({ ...prev, signatureUrl: e.target.value, signatureText: e.target.value }))}
                      className="w-full rounded-lg border border-border/80 bg-background px-2.5 py-1.5 text-xs text-foreground"
                      placeholder="https://... signature image"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <UploadCard
                    compact={true}
                    label="Company Stamp / Seal"
                    value={form.companySealUrl}
                    onChange={(val) => setForm((prev) => ({ ...prev, companySealUrl: val }))}
                    placeholder="Upload official stamp"
                  />
                  <div>
                    <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                      Direct Seal URL / Base64
                    </label>
                    <input
                      type="text"
                      value={form.companySealUrl}
                      onChange={(e) => setForm((prev) => ({ ...prev, companySealUrl: e.target.value }))}
                      className="w-full rounded-lg border border-border/80 bg-background px-2.5 py-1.5 text-xs text-foreground"
                      placeholder="https://... stamp image"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
