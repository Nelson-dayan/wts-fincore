"use client";

import { useEffect, useState, useId } from "react";
import { 
  User, 
  Mail, 
  Phone, 
  ShieldCheck, 
  Shield, 
  KeyRound, 
  Eye, 
  EyeOff, 
  Building2, 
  Check, 
  Copy, 
  Save, 
  Loader2, 
  AlertCircle, 
  Calendar, 
  Briefcase, 
  Sparkles, 
  CheckCircle2,
  Trash2,
  Lock,
  Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { UploadCard } from "@/components/ui/upload-card";
import { SaveSuccessToast } from "@/components/ui/save-success-toast";
import { apiFetch } from "@/lib/api/client";
import { isImageSrc } from "@/lib/utils/is-image-src";
import { cn } from "@/lib/utils/cn";
import { format } from "date-fns";

export interface UserProfileData {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string;
  signatureUrl: string;
  defaultCompanyId: string | null;
  companyMemberships?: Array<{
    companyId: string;
    role: string;
    permissions?: string[];
    isDefault?: boolean;
    joinedAt?: string;
  }>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserCompanyInfo {
  _id: string;
  name: string;
  code: string;
  baseCurrency: string;
  isPrimary?: boolean;
  kind?: string;
}

interface UserProfileResponse {
  user: UserProfileData;
  companies: UserCompanyInfo[];
  isSuperAdmin: boolean;
}

export function UserProfileClient({ portal }: { portal: "admin" | "employee" }) {
  const [data, setData] = useState<UserProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"info" | "signature" | "security" | "companies">("info");

  // Tab 1: Personal Info Form
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [savingInfo, setSavingInfo] = useState(false);

  // Tab 2: Signature
  const [signatureUrl, setSignatureUrl] = useState("");
  const [savingSignature, setSavingSignature] = useState(false);

  // Tab 3: Password Form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Tab 4: Default Company
  const [defaultCompanyId, setDefaultCompanyId] = useState<string>("");
  const [savingCompany, setSavingCompany] = useState(false);

  // General feedback
  const [successToast, setSuccessToast] = useState<string>("");
  const [copiedEmail, setCopiedEmail] = useState(false);

  const nameInputId = useId();
  const phoneInputId = useId();
  const emailInputId = useId();
  const currentPassId = useId();
  const newPassId = useId();
  const confirmPassId = useId();
  const defaultCompanySelectId = useId();

  function showSuccess(msg: string) {
    setSuccessToast(msg);
    setTimeout(() => {
      setSuccessToast("");
    }, 3500);
  }

  async function loadProfile() {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch<UserProfileResponse>("/api/user/profile");
      setData(res);
      setName(res.user.name || "");
      setPhone(res.user.phone || "");
      setSignatureUrl(res.user.signatureUrl || "");
      setDefaultCompanyId(res.user.defaultCompanyId || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  // Save personal details
  async function handleSaveInfo(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      setSavingInfo(true);
      setError(null);
      const res = await apiFetch<{ user: UserProfileData; message: string }>("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() }),
      });
      if (res.user) {
        setData((prev) => (prev ? { ...prev, user: { ...prev.user, ...res.user } } : null));
        setName(res.user.name);
        setPhone(res.user.phone);
        showSuccess("Profile details updated successfully!");
        window.dispatchEvent(
          new CustomEvent("wts-user-profile-updated", {
            detail: { name: res.user.name, phone: res.user.phone },
          })
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile details");
    } finally {
      setSavingInfo(false);
    }
  }

  // Save digital signature
  async function handleSaveSignature() {
    try {
      setSavingSignature(true);
      setError(null);
      const res = await apiFetch<{ user: UserProfileData; message: string }>("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signatureUrl: signatureUrl.trim() }),
      });
      if (res.user) {
        setData((prev) => (prev ? { ...prev, user: { ...prev.user, ...res.user } } : null));
        setSignatureUrl(res.user.signatureUrl);
        showSuccess("Digital signature updated successfully!");
        window.dispatchEvent(
          new CustomEvent("wts-user-profile-updated", {
            detail: { signatureUrl: res.user.signatureUrl },
          })
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save digital signature");
    } finally {
      setSavingSignature(false);
    }
  }

  // Save password change
  async function handleSavePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);

    if (!currentPassword) {
      setPasswordError("Please enter your current password.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    try {
      setSavingPassword(true);
      const res = await apiFetch<{ message: string }>("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showSuccess(res.message || "Password changed successfully!");
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setSavingPassword(false);
    }
  }

  // Save default company preference
  async function handleSaveDefaultCompany() {
    try {
      setSavingCompany(true);
      setError(null);
      const res = await apiFetch<{ user: UserProfileData; message: string }>("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultCompanyId: defaultCompanyId || null }),
      });
      if (res.user) {
        setData((prev) => (prev ? { ...prev, user: { ...prev.user, ...res.user } } : null));
        setDefaultCompanyId(res.user.defaultCompanyId || "");
        showSuccess("Default startup company updated!");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update default company");
    } finally {
      setSavingCompany(false);
    }
  }

  function copyEmailToClipboard() {
    if (!data?.user.email) return;
    navigator.clipboard.writeText(data.user.email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  }

  // Generate initials from name or email
  const initials = (() => {
    if (data?.user.name) {
      const parts = data.user.name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return parts[0].slice(0, 2).toUpperCase();
    }
    if (data?.user.email) {
      return data.user.email.slice(0, 2).toUpperCase();
    }
    return "ME";
  })();

  const roleLabel = (() => {
    if (!data?.user.role) return "Employee";
    if (data.user.role === "super_admin") return "Super Administrator";
    if (data.user.role === "admin") return "Administrator";
    return "Staff / Employee";
  })();

  const roleBadgeClass = (() => {
    if (data?.user.role === "super_admin") {
      return "border-purple-500/40 bg-purple-500/15 text-purple-700 dark:text-purple-300";
    }
    if (data?.user.role === "admin") {
      return "border-blue-500/40 bg-blue-500/15 text-blue-700 dark:text-blue-300";
    }
    return "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
  })();

  const defaultCompanyName =
    data?.companies.find((c) => c._id === data?.user.defaultCompanyId)?.name ||
    (data?.companies.length ? data.companies[0].name : "Primary Organization");

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3">
        <Loader2 className="size-8 animate-spin text-primary opacity-80" />
        <p className="text-sm text-muted-foreground animate-pulse font-medium">
          Loading your personal profile...
        </p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-center">
        <AlertCircle className="mx-auto size-8 text-destructive mb-3" />
        <h3 className="text-lg font-semibold text-destructive">Unable to load profile</h3>
        <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        <Button onClick={loadProfile} variant="outline" className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  const user = data!.user;
  const companies = data!.companies;

  return (
    <div className="space-y-8 pb-12">
      <SaveSuccessToast message={successToast} />

      {/* Top Banner Notice: "This is you" */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary shadow-inner">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">
                  This Is You • Official User Identity
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active
                </span>
              </div>
              <p className="text-xs text-muted-foreground sm:text-sm mt-0.5">
                You are authenticated as <strong className="text-foreground">{user.name || user.email}</strong>. 
                Any details, digital signatures, or credentials updated below are immediately bound to your session and official records.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
            <span className="text-xs text-muted-foreground font-mono">
              Portal: <span className="capitalize font-semibold text-foreground">{portal}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Hero Identity Card */}
      <Card className="overflow-hidden border-border/80 bg-gradient-to-b from-card via-card to-card/60 shadow-lg">
        <div className="h-24 sm:h-32 bg-gradient-to-r from-primary/20 via-primary/10 to-accent/20 border-b border-border/50 relative">
          <div className="absolute inset-0 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px] opacity-15" />
        </div>

        <div className="px-6 pb-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 -mt-12 sm:-mt-16 mb-4">
            <div className="flex items-end gap-4">
              <div className="relative group">
                <div className="size-24 sm:size-28 rounded-2xl bg-gradient-to-tr from-primary via-primary/90 to-primary/70 text-primary-foreground font-bold text-3xl sm:text-4xl flex items-center justify-center shadow-xl ring-4 ring-background border border-primary/20 transition-transform group-hover:scale-105">
                  {initials}
                </div>
                <div 
                  className="absolute bottom-1 right-1 size-5 rounded-full bg-emerald-500 ring-2 ring-background shadow-sm flex items-center justify-center"
                  title="Account is active and verified"
                >
                  <Check className="size-3 text-white" />
                </div>
              </div>

              <div className="space-y-1 mb-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                    {user.name || "User Account"}
                  </h1>
                  <Badge variant="outline" className={cn("px-2.5 py-0.5 font-medium text-xs", roleBadgeClass)}>
                    {roleLabel}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{user.email}</span>
                  <button
                    type="button"
                    onClick={copyEmailToClipboard}
                    className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title="Copy email to clipboard"
                    aria-label="Copy email address"
                  >
                    {copiedEmail ? (
                      <Check className="size-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto justify-end">
              <div className="flex items-center gap-1.5 rounded-xl border border-border/70 bg-background/60 px-3.5 py-2 text-xs text-muted-foreground backdrop-blur">
                <Calendar className="size-3.5 text-primary/80 shrink-0" />
                <span>
                  Member since{" "}
                  <strong className="text-foreground font-medium">
                    {user.createdAt ? format(new Date(user.createdAt), "MMM d, yyyy") : "Recently"}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-border/60">
            <div className="rounded-xl bg-muted/40 p-3 border border-border/40">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground block">
                Primary Workspace
              </span>
              <p className="text-sm font-semibold text-foreground truncate mt-0.5" title={defaultCompanyName}>
                {defaultCompanyName}
              </p>
            </div>

            <div className="rounded-xl bg-muted/40 p-3 border border-border/40">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground block">
                Company Memberships
              </span>
              <p className="text-sm font-semibold text-foreground mt-0.5">
                {companies.length} {companies.length === 1 ? "Organization" : "Organizations"}
              </p>
            </div>

            <div className="rounded-xl bg-muted/40 p-3 border border-border/40">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground block">
                Contact Phone
              </span>
              <p className="text-sm font-semibold text-foreground truncate mt-0.5">
                {user.phone || <span className="text-muted-foreground italic font-normal">Not configured</span>}
              </p>
            </div>

            <div className="rounded-xl bg-muted/40 p-3 border border-border/40">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground block">
                Digital Signature
              </span>
              <p className="text-sm font-semibold text-foreground mt-0.5 flex items-center gap-1.5">
                {user.signatureUrl ? (
                  <>
                    <span className="size-2 rounded-full bg-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400">Configured</span>
                  </>
                ) : (
                  <>
                    <span className="size-2 rounded-full bg-amber-500" />
                    <span className="text-amber-600 dark:text-amber-400">None uploaded</span>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Error banner if present */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="size-5 shrink-0" />
          <div className="flex-1">{error}</div>
        </div>
      )}

      {/* Tabs Header Navigation */}
      <div className="flex border-b border-border/80 gap-1 overflow-x-auto pb-px">
        <button
          type="button"
          onClick={() => setActiveTab("info")}
          className={cn(
            "flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-all whitespace-nowrap",
            activeTab === "info"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
          )}
        >
          <User className="size-4 shrink-0" />
          <span>Personal Information</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("signature")}
          className={cn(
            "flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-all whitespace-nowrap",
            activeTab === "signature"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
          )}
        >
          <Sparkles className="size-4 shrink-0" />
          <span>Official Signature</span>
          {user.signatureUrl && (
            <span className="size-1.5 rounded-full bg-emerald-500" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("security")}
          className={cn(
            "flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-all whitespace-nowrap",
            activeTab === "security"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
          )}
        >
          <KeyRound className="size-4 shrink-0" />
          <span>Security & Password</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("companies")}
          className={cn(
            "flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-all whitespace-nowrap",
            activeTab === "companies"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
          )}
        >
          <Building2 className="size-4 shrink-0" />
          <span>Workspaces & Access</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground font-mono">
            {companies.length}
          </span>
        </button>
      </div>

      {/* Tab 1: Personal Information */}
      {activeTab === "info" && (
        <Card className="border-border/80">
          <CardHeader>
            <CardTitle>Personal Details</CardTitle>
            <CardDescription>
              Update your display name and contact phone number. These details identify you on quotes, project logs, and approvals.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveInfo} className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor={nameInputId} className="text-sm font-medium text-foreground flex items-center gap-2">
                    <User className="size-3.5 text-muted-foreground" />
                    Full Display Name <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id={nameInputId}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    required
                    disabled={savingInfo}
                  />
                  <p className="text-[12px] text-muted-foreground">
                    This name is visible to colleagues and attached to generated financial documents.
                  </p>
                </div>

                <div className="space-y-2">
                  <label htmlFor={phoneInputId} className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Phone className="size-3.5 text-muted-foreground" />
                    Contact Phone Number
                  </label>
                  <Input
                    id={phoneInputId}
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+971 50 123 4567"
                    disabled={savingInfo}
                  />
                  <p className="text-[12px] text-muted-foreground">
                    Mobile or direct corporate extension for workflow notifications.
                  </p>
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 pt-2 border-t border-border/60">
                <div className="space-y-2">
                  <label htmlFor={emailInputId} className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Mail className="size-3.5 text-muted-foreground" />
                    Account Email Address
                  </label>
                  <Input
                    id={emailInputId}
                    value={user.email}
                    disabled
                    className="bg-muted/50 cursor-not-allowed opacity-80"
                  />
                  <p className="text-[12px] text-muted-foreground flex items-center gap-1">
                    <Lock className="size-3 text-muted-foreground shrink-0" />
                    Primary login identity. Contact a System Administrator to change your registered email address.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Shield className="size-3.5 text-muted-foreground" />
                    System Role & Privilege Tier
                  </label>
                  <div className="flex h-10 w-full items-center justify-between rounded-lg border border-border bg-muted/40 px-3.5 text-sm text-foreground">
                    <span className="font-semibold">{roleLabel}</span>
                    <Badge variant="outline" className={cn("text-[11px]", roleBadgeClass)}>
                      Authorized
                    </Badge>
                  </div>
                  <p className="text-[12px] text-muted-foreground">
                    Your global authority tier across this Sec-DocuTrade instance.
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-border/60">
                <Button
                  type="submit"
                  disabled={savingInfo || (name === user.name && phone === (user.phone || ""))}
                  className="gap-2 min-w-36"
                >
                  {savingInfo ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="size-4" />
                      Save Details
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Tab 2: Digital Signature */}
      {activeTab === "signature" && (
        <Card className="border-border/80">
          <CardHeader>
            <CardTitle>Official Digital Signature</CardTitle>
            <CardDescription>
              Your digital signature is affixed to official Quotations, Purchase Orders, and Invoice approvals. Upload a clear PNG or JPG with a transparent background.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Sparkles className="size-4 text-primary" />
                  Upload or Replace Signature
                </h4>
                
                <UploadCard
                  label="Official Signature File"
                  placeholder="Drop signature image (PNG/JPG) here or click to browse"
                  value={signatureUrl}
                  onChange={(val) => setSignatureUrl(val)}
                />

                <p className="text-xs text-muted-foreground">
                  Tip: A high-contrast black or dark-blue signature on a transparent background gives the most professional PDF result.
                </p>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-500" />
                  Live Preview on Official Documents
                </h4>

                <div className="rounded-xl border border-border/80 bg-background/80 p-5 shadow-inner">
                  <div className="rounded-lg border border-dashed border-border/90 bg-muted/20 p-6 flex flex-col items-center justify-center min-h-[160px] relative">
                    {signatureUrl && isImageSrc(signatureUrl) ? (
                      <div className="flex flex-col items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={signatureUrl}
                          alt="Your digital signature"
                          className="max-h-24 max-w-full object-contain filter drop-shadow-sm"
                        />
                        <div className="w-48 border-t border-foreground/40 pt-1 text-center">
                          <p className="text-xs font-semibold text-foreground">{user.name || user.email}</p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{roleLabel}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center space-y-2 text-muted-foreground">
                        <AlertCircle className="size-8 mx-auto opacity-40" />
                        <p className="text-xs font-medium">No signature image currently configured</p>
                        <p className="text-[11px] opacity-75">Upload a file on the left to activate digital sign-offs</p>
                      </div>
                    )}
                  </div>

                  {signatureUrl && (
                    <div className="mt-3 flex justify-between items-center text-xs">
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                        <Check className="size-3.5" />
                        Signature ready for documents
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setSignatureUrl("")}
                        className="text-destructive hover:bg-destructive/10 text-xs h-7 px-2"
                      >
                        <Trash2 className="size-3 mr-1" />
                        Clear
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-border/60">
              <Button
                type="button"
                onClick={handleSaveSignature}
                disabled={savingSignature || signatureUrl === (user.signatureUrl || "")}
                className="gap-2 min-w-36"
              >
                {savingSignature ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Saving Signature...
                  </>
                ) : (
                  <>
                    <Save className="size-4" />
                    Save Signature
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab 3: Security & Password */}
      {activeTab === "security" && (
        <Card className="border-border/80">
          <CardHeader>
            <CardTitle>Security & Password</CardTitle>
            <CardDescription>
              Ensure your account is protected with a secure password. You must verify your current password to make changes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSavePassword} className="space-y-6 max-w-xl">
              {passwordError && (
                <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-sm text-destructive">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor={currentPassId} className="text-sm font-medium text-foreground flex items-center gap-2">
                  <KeyRound className="size-3.5 text-muted-foreground" />
                  Current Password <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <Input
                    id={currentPassId}
                    type={showCurrentPass ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter your current password"
                    required
                    disabled={savingPassword}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showCurrentPass ? "Hide current password" : "Show current password"}
                  >
                    {showCurrentPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor={newPassId} className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Lock className="size-3.5 text-muted-foreground" />
                  New Password <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <Input
                    id={newPassId}
                    type={showNewPass ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter a new password (min. 6 characters)"
                    required
                    disabled={savingPassword}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showNewPass ? "Hide new password" : "Show new password"}
                  >
                    {showNewPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor={confirmPassId} className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Check className="size-3.5 text-muted-foreground" />
                  Confirm New Password <span className="text-destructive">*</span>
                </label>
                <Input
                  id={confirmPassId}
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your new password"
                  required
                  disabled={savingPassword}
                />
              </div>

              {/* Password checklist */}
              <div className="rounded-xl bg-muted/40 p-4 border border-border/50 space-y-2 text-xs">
                <span className="font-semibold text-foreground uppercase tracking-wider block text-[11px]">
                  Password Requirements:
                </span>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className={cn("size-2 rounded-full", newPassword.length >= 6 ? "bg-emerald-500" : "bg-muted-foreground/40")} />
                  <span className={newPassword.length >= 6 ? "text-foreground font-medium" : ""}>
                    At least 6 characters in length
                  </span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className={cn("size-2 rounded-full", newPassword && newPassword === confirmPassword ? "bg-emerald-500" : "bg-muted-foreground/40")} />
                  <span className={newPassword && newPassword === confirmPassword ? "text-foreground font-medium" : ""}>
                    Passwords match
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={savingPassword || !currentPassword || newPassword.length < 6 || newPassword !== confirmPassword}
                  className="gap-2 min-w-40"
                >
                  {savingPassword ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Updating Password...
                    </>
                  ) : (
                    <>
                      <KeyRound className="size-4" />
                      Update Password
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Tab 4: Workspaces & Companies */}
      {activeTab === "companies" && (
        <div className="space-y-6">
          <Card className="border-border/80">
            <CardHeader>
              <CardTitle>Default Startup Workspace</CardTitle>
              <CardDescription>
                Choose which corporate entity automatically opens upon sign in. You can still switch companies dynamically via the header switcher.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 max-w-xl">
                <div className="flex-1">
                  <label htmlFor={defaultCompanySelectId} className="sr-only">
                    Default Company
                  </label>
                  <select
                    id={defaultCompanySelectId}
                    value={defaultCompanyId}
                    onChange={(e) => setDefaultCompanyId(e.target.value)}
                    className="flex h-10 w-full rounded-lg border border-input bg-background/60 px-3.5 py-2 text-sm shadow-sm transition-all focus:border-ring/60 focus:outline-none focus:ring-2 focus:ring-ring/30"
                  >
                    <option value="">-- System Primary Default --</option>
                    {companies.map((comp) => (
                      <option key={comp._id} value={comp._id}>
                        {comp.name} ({comp.code}) - {comp.baseCurrency}
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  onClick={handleSaveDefaultCompany}
                  disabled={savingCompany || defaultCompanyId === (user.defaultCompanyId || "")}
                  className="gap-2 shrink-0"
                >
                  {savingCompany ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                  Set as Default
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Assigned Companies List */}
          <Card className="border-border/80">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Assigned Workspaces & Entities</CardTitle>
                  <CardDescription>
                    All corporate organizations and business units your account is authorized to access.
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="font-mono">
                  {companies.length} Total
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {companies.map((comp) => {
                  const isCurrentDefault = comp._id === (user.defaultCompanyId || "");
                  return (
                    <div
                      key={comp._id}
                      className={cn(
                        "rounded-xl border p-4 transition-all flex flex-col justify-between gap-3",
                        isCurrentDefault
                          ? "border-primary/50 bg-primary/5 shadow-sm"
                          : "border-border/70 bg-card/60 hover:border-border"
                      )}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="font-mono text-xs font-bold uppercase tracking-wider text-primary">
                            {comp.code}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {comp.isPrimary && (
                              <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">
                                Primary
                              </Badge>
                            )}
                            {isCurrentDefault && (
                              <Badge variant="default" className="text-[10px] bg-emerald-600 text-white">
                                Default Startup
                              </Badge>
                            )}
                          </div>
                        </div>

                        <h4 className="font-semibold text-foreground text-sm line-clamp-1" title={comp.name}>
                          {comp.name}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                          Entity Type: {comp.kind || "Operating Entity"}
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-3 border-t border-border/50 text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Layers className="size-3 text-muted-foreground" />
                          Currency: <strong className="text-foreground font-mono">{comp.baseCurrency}</strong>
                        </span>
                        <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                          Authorized
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
