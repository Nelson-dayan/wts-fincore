"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  Plus,
  Network,
  Layers,
  ChevronRight,
  Shield,
  FileText,
  DollarSign,
  Globe,
  Trash2,
  Edit2,
  Check,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface CompanyItem {
  _id: string;
  name: string;
  code: string;
  kind: "holding" | "operating" | "branch" | "division";
  parentCompanyId?: any;
  taxId?: string;
  baseCurrency?: string;
  supportedCurrencies?: string[];
  address?: string;
  email?: string;
  phone?: string;
  website?: string;
  contactName?: string;
  isActive?: boolean;
  isPrimary?: boolean;
  branding?: {
    logoUrl?: string;
    logoText?: string;
    signatureUrl?: string;
    signatureText?: string;
    companySealUrl?: string;
    invoicePrefix?: string;
    quotationPrefix?: string;
    poPrefix?: string;
    invoiceFooter?: string;
    bankDetailsText?: string;
  };
}

export interface TreeNode extends CompanyItem {
  children: TreeNode[];
}

export default function CompaniesManagementPage() {
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"tree" | "list">("tree");
  const [editingCompany, setEditingCompany] = useState<CompanyItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    kind: "operating",
    parentCompanyId: "",
    taxId: "",
    baseCurrency: "AED",
    address: "",
    email: "",
    phone: "",
    website: "",
    contactName: "",
    isPrimary: false,
    logoUrl: "",
    logoText: "",
    signatureUrl: "",
    signatureText: "",
    companySealUrl: "",
    invoicePrefix: "",
    quotationPrefix: "",
    poPrefix: "",
    invoiceFooter: "",
    bankDetailsText: "",
  });

  const fetchCompanyData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/companies/tree");
      if (res.ok) {
        const data = await res.json();
        setTree(data.tree || []);
        setCompanies(data.companies || []);
      }
    } catch (err) {
      console.error("Failed to load companies:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanyData();
  }, []);

  const openModalForCreate = (parentId: string = "") => {
    setEditingCompany(null);
    setFormData({
      name: "",
      code: "",
      kind: parentId ? "branch" : "operating",
      parentCompanyId: parentId,
      taxId: "",
      baseCurrency: "AED",
      address: "",
      email: "",
      phone: "",
      website: "",
      contactName: "",
      isPrimary: false,
      logoUrl: "",
      logoText: "",
      signatureUrl: "",
      signatureText: "",
      companySealUrl: "",
      invoicePrefix: "INV-",
      quotationPrefix: "QT-",
      poPrefix: "PO-",
      invoiceFooter: "",
      bankDetailsText: "",
    });
    setIsModalOpen(true);
  };

  const openModalForEdit = (comp: CompanyItem) => {
    setEditingCompany(comp);
    const pId = comp.parentCompanyId
      ? typeof comp.parentCompanyId === "object"
        ? comp.parentCompanyId._id
        : comp.parentCompanyId
      : "";

    setFormData({
      name: comp.name || "",
      code: comp.code || "",
      kind: comp.kind || "operating",
      parentCompanyId: pId || "",
      taxId: comp.taxId || "",
      baseCurrency: comp.baseCurrency || "AED",
      address: comp.address || "",
      email: comp.email || "",
      phone: comp.phone || "",
      website: comp.website || "",
      contactName: comp.contactName || "",
      isPrimary: !!comp.isPrimary,
      logoUrl: comp.branding?.logoUrl || "",
      logoText: comp.branding?.logoText || "",
      signatureUrl: comp.branding?.signatureUrl || "",
      signatureText: comp.branding?.signatureText || "",
      companySealUrl: comp.branding?.companySealUrl || "",
      invoicePrefix: comp.branding?.invoicePrefix || `${comp.code}-INV`,
      quotationPrefix: comp.branding?.quotationPrefix || `${comp.code}-QT`,
      poPrefix: comp.branding?.poPrefix || `${comp.code}-PO`,
      invoiceFooter: comp.branding?.invoiceFooter || "",
      bankDetailsText: comp.branding?.bankDetailsText || "",
    });
    setIsModalOpen(true);
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const payload = {
      name: formData.name,
      code: formData.code,
      kind: formData.kind,
      parentCompanyId: formData.parentCompanyId || null,
      taxId: formData.taxId,
      baseCurrency: formData.baseCurrency,
      address: formData.address,
      email: formData.email,
      phone: formData.phone,
      website: formData.website,
      contactName: formData.contactName,
      isPrimary: formData.isPrimary,
      branding: {
        logoUrl: formData.logoUrl,
        logoText: formData.logoText,
        signatureUrl: formData.signatureUrl,
        signatureText: formData.signatureText,
        companySealUrl: formData.companySealUrl,
        invoicePrefix: formData.invoicePrefix,
        quotationPrefix: formData.quotationPrefix,
        poPrefix: formData.poPrefix,
        invoiceFooter: formData.invoiceFooter,
        bankDetailsText: formData.bankDetailsText,
      },
    };

    try {
      const url = editingCompany
        ? `/api/admin/companies/${editingCompany._id}`
        : "/api/admin/companies";
      const method = editingCompany ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to save company");
      }

      setMessage(`Company successfully ${editingCompany ? "updated" : "created"}!`);
      setIsModalOpen(false);
      await fetchCompanyData();
    } catch (err: any) {
      setMessage(err.message || "An error occurred while saving company.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCompany = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to soft-delete "${name}"?`)) return;

    try {
      const res = await fetch(`/api/admin/companies/${id}`, { method: "DELETE" });
      if (res.ok) {
        setMessage(`Company "${name}" soft-deleted successfully.`);
        await fetchCompanyData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const renderTreeNode = (node: TreeNode, depth: number = 0) => {
    return (
      <div key={node._id} className="space-y-2">
        <div
          className={cn(
            "group flex items-center justify-between rounded-xl border bg-card p-4 shadow-sm transition-all hover:border-primary/50 hover:shadow-md",
            depth > 0 && "ml-6 border-l-4 border-l-primary/60"
          )}
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground">{node.name}</h3>
                <span className="font-mono text-xs font-bold uppercase rounded bg-muted px-1.5 py-0.5 text-muted-foreground">
                  {node.code}
                </span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                    node.kind === "holding" && "bg-purple-500/10 text-purple-600 dark:text-purple-400",
                    node.kind === "operating" && "bg-blue-500/10 text-blue-600 dark:text-blue-400",
                    node.kind === "branch" && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                    node.kind === "division" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  )}
                >
                  {node.kind}
                </span>
                {node.isPrimary && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="h-3 w-3" /> Primary Headquarter
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Base Currency: <span className="font-semibold text-foreground">{node.baseCurrency}</span> • Tax ID:{" "}
                <span className="font-mono">{node.taxId || "N/A"}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openModalForCreate(node._id)}
              className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary/40 hover:bg-muted hover:text-foreground transition-colors"
            >
              <Plus className="h-3.5 w-3.5 text-primary" /> Add Branch
            </button>
            <button
              type="button"
              onClick={() => openModalForEdit(node)}
              className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary/40 hover:bg-muted hover:text-foreground transition-colors"
            >
              <Edit2 className="h-3.5 w-3.5" /> Edit
            </button>
            {!node.isPrimary && (
              <button
                type="button"
                onClick={() => handleDeleteCompany(node._id, node.name)}
                className="flex items-center gap-1 rounded-lg border border-destructive/30 px-2 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {node.children && node.children.length > 0 && (
          <div className="space-y-2">
            {node.children.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Network className="h-6 w-6 text-primary" /> Company Hierarchy & Branding
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your parent holding group, operating companies, international branches, and custom document branding.
          </p>
        </div>
        <button
          type="button"
          onClick={() => openModalForCreate("")}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Add Company
        </button>
      </div>

      {message && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-600 dark:text-emerald-400">
          {message}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-border pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("tree")}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              activeTab === "tree"
                ? "bg-primary text-primary-foreground font-semibold"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Network className="h-4 w-4" /> Visual Tree
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("list")}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              activeTab === "list"
                ? "bg-primary text-primary-foreground font-semibold"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Layers className="h-4 w-4" /> Flat Table List ({companies.length})
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
          Loading company hierarchy...
        </div>
      ) : activeTab === "tree" ? (
        <div className="space-y-4">
          {tree.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No active companies found. Click "Add Company" to create your first holding or operating entity.
            </div>
          ) : (
            tree.map((node) => renderTreeNode(node))
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-muted/40 font-semibold uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Code & Name</th>
                <th className="px-4 py-3">Kind</th>
                <th className="px-4 py-3">Currency</th>
                <th className="px-4 py-3">Tax ID</th>
                <th className="px-4 py-3">Prefixes</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {companies.map((comp) => (
                <tr key={comp._id} className="hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-foreground">{comp.name}</div>
                    <div className="font-mono text-[11px] text-primary">{comp.code}</div>
                  </td>
                  <td className="px-4 py-3 capitalize">{comp.kind}</td>
                  <td className="px-4 py-3 font-semibold">{comp.baseCurrency}</td>
                  <td className="px-4 py-3 font-mono">{comp.taxId || "-"}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                    Inv: {comp.branding?.invoicePrefix || `${comp.code}-INV`}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => openModalForEdit(comp)}
                      className="rounded-md border border-border px-2 py-1 font-medium hover:bg-muted"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal for Creating / Editing */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-lg font-bold text-foreground">
                {editingCompany ? `Edit Company: ${editingCompany.name}` : "Create New Company"}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCompany} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium mb-1">Company Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="e.g. Docutrade Holding LLC"
                  />
                </div>

                <div>
                  <label className="block font-medium mb-1">Unique Company Code (3-6 chars) *</label>
                  <input
                    type="text"
                    required
                    maxLength={8}
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full font-mono rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary uppercase"
                    placeholder="e.g. DXB, IND, UK"
                  />
                </div>

                <div>
                  <label className="block font-medium mb-1">Entity Kind</label>
                  <select
                    value={formData.kind}
                    onChange={(e) => setFormData({ ...formData, kind: e.target.value as any })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="holding">Holding Group (Parent)</option>
                    <option value="operating">Operating Company</option>
                    <option value="branch">Branch (Regional office)</option>
                    <option value="division">Division / Subsidiary</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium mb-1">Parent Company</label>
                  <select
                    value={formData.parentCompanyId}
                    onChange={(e) => setFormData({ ...formData, parentCompanyId: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">None (Top-Level Holding)</option>
                    {companies
                      .filter((c) => c._id !== editingCompany?._id)
                      .map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name} ({c.code})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium mb-1">Base Currency</label>
                  <select
                    value={formData.baseCurrency}
                    onChange={(e) => setFormData({ ...formData, baseCurrency: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="AED">AED - UAE Dirham</option>
                    <option value="USD">USD - US Dollar</option>
                    <option value="INR">INR - Indian Rupee</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium mb-1">Tax Registration / TRN / VAT ID</label>
                  <input
                    type="text"
                    value={formData.taxId}
                    onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                    className="w-full font-mono rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="e.g. 100459827000003"
                  />
                </div>
              </div>

              {/* Branding Section */}
              <div className="border-t border-border pt-3 space-y-3">
                <h3 className="font-semibold text-primary text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="h-4 w-4" /> Enterprise Branding & Document Prefixes
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-medium mb-1">Invoice Prefix</label>
                    <input
                      type="text"
                      value={formData.invoicePrefix}
                      onChange={(e) => setFormData({ ...formData, invoicePrefix: e.target.value })}
                      className="w-full font-mono rounded-lg border border-border bg-background px-2.5 py-1.5"
                      placeholder="e.g. DXB-INV-"
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1">Quotation Prefix</label>
                    <input
                      type="text"
                      value={formData.quotationPrefix}
                      onChange={(e) => setFormData({ ...formData, quotationPrefix: e.target.value })}
                      className="w-full font-mono rounded-lg border border-border bg-background px-2.5 py-1.5"
                      placeholder="e.g. DXB-QT-"
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1">PO Prefix</label>
                    <input
                      type="text"
                      value={formData.poPrefix}
                      onChange={(e) => setFormData({ ...formData, poPrefix: e.target.value })}
                      className="w-full font-mono rounded-lg border border-border bg-background px-2.5 py-1.5"
                      placeholder="e.g. DXB-PO-"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium mb-1">Logo URL / Data Text</label>
                    <input
                      type="text"
                      value={formData.logoUrl}
                      onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                      className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5"
                      placeholder="https://... or data:image/png..."
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1">Company Seal Stamp URL</label>
                    <input
                      type="text"
                      value={formData.companySealUrl}
                      onChange={(e) => setFormData({ ...formData, companySealUrl: e.target.value })}
                      className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5"
                      placeholder="https://... official stamp image"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 border-t border-border pt-3">
                <input
                  type="checkbox"
                  id="isPrimaryCheck"
                  checked={formData.isPrimary}
                  onChange={(e) => setFormData({ ...formData, isPrimary: e.target.checked })}
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                />
                <label htmlFor="isPrimaryCheck" className="font-semibold text-foreground cursor-pointer">
                  Set as Primary Headquarter Company
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground shadow-md hover:bg-primary/90"
                >
                  {saving ? "Saving..." : "Save Company"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
