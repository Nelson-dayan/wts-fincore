"use client";

import { useEffect, useState, useRef } from "react";
import {
  Building2,
  Plus,
  Network,
  Layers,
  ChevronRight,
  ChevronDown,
  Globe,
  Trash2,
  Edit2,
  CheckCircle2,
  GitBranch,
  MoreHorizontal,
  FileText,
  Building,
  ShieldCheck,
  Maximize2,
  Minimize2,
  Briefcase,
  Store,
  Sparkles,
  Info,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { UploadCard } from "@/components/ui/upload-card";
import { Dropdown } from "@/components/ui/select";
import { isImageSrc } from "@/lib/utils/is-image-src";

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
  logoText?: string;
  signatureText?: string;
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
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [editingCompany, setEditingCompany] = useState<CompanyItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<"general" | "branding">("general");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Dropdown states
  const [addDropdownOpen, setAddDropdownOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const addDropdownRef = useRef<HTMLDivElement>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    kind: "operating" as "holding" | "operating" | "branch" | "division",
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
        const treeData: TreeNode[] = data.tree || [];
        const flatData: CompanyItem[] = data.companies || [];
        setTree(treeData);
        setCompanies(flatData);

        // By default, expand all nodes that have children
        const initialExpanded = new Set<string>();
        const collectNodeIds = (nodes: TreeNode[]) => {
          for (const node of nodes) {
            if (node.children && node.children.length > 0) {
              initialExpanded.add(node._id);
              collectNodeIds(node.children);
            }
          }
        };
        collectNodeIds(treeData);
        setExpandedNodes(initialExpanded);
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

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (addDropdownRef.current && !addDropdownRef.current.contains(e.target as Node)) {
        setAddDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Expand / Collapse Handlers
  const toggleNodeExpand = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    const allIds = new Set<string>();
    const collect = (nodes: TreeNode[]) => {
      for (const n of nodes) {
        if (n.children && n.children.length > 0) {
          allIds.add(n._id);
          collect(n.children);
        }
      }
    };
    collect(tree);
    setExpandedNodes(allIds);
  };

  const handleCollapseAll = () => {
    setExpandedNodes(new Set());
  };

  // Open Modal Handlers
  const openModalForCreate = (
    kind: "holding" | "operating" | "branch" | "division" = "operating",
    parentId: string = ""
  ) => {
    setEditingCompany(null);
    setModalTab("general");
    
    // Auto-select logical parent if not provided
    let defaultParent = parentId;
    if (!defaultParent && kind !== "holding") {
      if (kind === "operating") {
        const holding = companies.find((c) => c.kind === "holding");
        if (holding) defaultParent = holding._id;
      } else if (kind === "branch" || kind === "division") {
        const operating = companies.find((c) => c.kind === "operating" || c.isPrimary);
        if (operating) defaultParent = operating._id;
      }
    }

    setFormData({
      name: "",
      code: "",
      kind,
      parentCompanyId: kind === "holding" ? "" : defaultParent,
      taxId: "",
      baseCurrency: "AED",
      address: "",
      email: "",
      phone: "",
      website: "",
      contactName: "",
      isPrimary: companies.length === 0,
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
    setAddDropdownOpen(false);
    setActiveMenuId(null);
    setIsModalOpen(true);
  };

  const openModalForEdit = (comp: CompanyItem, tab: "general" | "branding" = "general") => {
    setEditingCompany(comp);
    setModalTab(tab);
    const pId = comp.parentCompanyId
      ? typeof comp.parentCompanyId === "object"
        ? comp.parentCompanyId._id
        : comp.parentCompanyId
      : "";

    const logoImg = [
      comp.branding?.logoUrl,
      comp.logoText,
      comp.branding?.logoText,
    ].find((val) => typeof val === "string" && isImageSrc(val)) || "";

    const sigImg = [
      comp.branding?.signatureUrl,
      comp.signatureText,
      comp.branding?.signatureText,
    ].find((val) => typeof val === "string" && isImageSrc(val)) || "";

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
      logoUrl: logoImg,
      logoText: logoImg,
      signatureUrl: sigImg,
      signatureText: sigImg,
      companySealUrl: comp.branding?.companySealUrl || "",
      invoicePrefix: comp.branding?.invoicePrefix || `${comp.code}-INV`,
      quotationPrefix: comp.branding?.quotationPrefix || `${comp.code}-QT`,
      poPrefix: comp.branding?.poPrefix || `${comp.code}-PO`,
      invoiceFooter: comp.branding?.invoiceFooter || "",
      bankDetailsText: comp.branding?.bankDetailsText || "",
    });
    setActiveMenuId(null);
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
      parentCompanyId: formData.kind === "holding" ? null : formData.parentCompanyId || null,
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
        logoText: formData.logoUrl,
        signatureUrl: formData.signatureUrl,
        signatureText: formData.signatureUrl,
        companySealUrl: formData.companySealUrl,
        invoicePrefix: formData.invoicePrefix,
        quotationPrefix: formData.quotationPrefix,
        poPrefix: formData.poPrefix,
        invoiceFooter: formData.invoiceFooter,
        bankDetailsText: formData.bankDetailsText,
      },
      logoText: formData.logoUrl,
      signatureText: formData.signatureUrl,
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

      setMessage({
        type: "success",
        text: `Company "${formData.name}" successfully ${editingCompany ? "updated" : "created"}!`,
      });
      setIsModalOpen(false);
      await fetchCompanyData();
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err.message || "An error occurred while saving company.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCompany = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete company "${name}"?`)) return;

    try {
      const res = await fetch(`/api/admin/companies/${id}`, { method: "DELETE" });
      if (res.ok) {
        setMessage({
          type: "success",
          text: `Company "${name}" deleted successfully.`,
        });
        await fetchCompanyData();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete company.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActiveMenuId(null);
    }
  };

  // Executive Summary Metrics (Derived from real data)
  const totalCompanies = companies.length;
  const holdingCount = companies.filter((c) => c.kind === "holding").length;
  const operatingCount = companies.filter((c) => c.kind === "operating").length;
  const branchCount = companies.filter((c) => c.kind === "branch" || c.kind === "division").length;
  const activeCount = companies.filter((c) => c.isActive !== false).length;

  const uniqueCurrencies = Array.from(
    new Set(companies.map((c) => c.baseCurrency).filter(Boolean))
  ) as string[];

  // Helper function to resolve parent name
  const getParentName = (parentId?: any) => {
    if (!parentId) return "None (Holding Parent)";
    const pId = typeof parentId === "object" ? parentId._id : parentId;
    const parentComp = companies.find((c) => c._id === pId);
    return parentComp ? `${parentComp.name} (${parentComp.code})` : "Parent Entity";
  };

  // Recursive Tree Node Component with Enterprise Connector Lines
  const TreeNodeCard = ({
    node,
    depth = 0,
    isLast = false,
    hasParent = false,
  }: {
    node: TreeNode;
    depth?: number;
    isLast?: boolean;
    hasParent?: boolean;
  }) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node._id);
    const isMenuOpen = activeMenuId === node._id;

    // Entity Icon & Color Styling
    const getKindConfig = (kind: string) => {
      switch (kind) {
        case "holding":
          return {
            label: "HOLDING",
            icon: Globe,
            badgeStyle: "bg-purple-500/10 text-purple-400 border-purple-500/20",
            iconBoxStyle: "bg-purple-500/10 text-purple-400 border-purple-500/20",
            isTopOwner: true,
          };
        case "operating":
          return {
            label: "OPERATING",
            icon: Briefcase,
            badgeStyle: "bg-blue-500/10 text-blue-400 border-blue-500/20",
            iconBoxStyle: "bg-blue-500/10 text-blue-400 border-blue-500/20",
            isTopOwner: false,
          };
        case "branch":
          return {
            label: "BRANCH",
            icon: GitBranch,
            badgeStyle: "bg-amber-500/10 text-amber-400 border-amber-500/20",
            iconBoxStyle: "bg-amber-500/10 text-amber-400 border-amber-500/20",
            isTopOwner: false,
          };
        default:
          return {
            label: "DIVISION",
            icon: Store,
            badgeStyle: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
            iconBoxStyle: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
            isTopOwner: false,
          };
      }
    };

    const kindConfig = getKindConfig(node.kind);
    const IconComponent = kindConfig.icon;

    return (
      <div className="relative group/node">
        {/* Child Node Tree Connector Lines */}
        {hasParent && (
          <div className="absolute -left-6 sm:-left-8 top-0 bottom-0 pointer-events-none">
            {/* Vertical stem line to next sibling */}
            <div
              className={cn(
                "absolute left-0 w-0.5 bg-border/60",
                isLast ? "top-0 h-7" : "top-0 bottom-0"
              )}
            />
            {/* Horizontal branch arm curving to node card */}
            <div className="absolute left-0 top-7 w-6 sm:w-8 h-0.5 bg-border/60 rounded-bl-sm" />
            {/* Node dot connector junction */}
            <div className="absolute left-[22px] sm:left-[30px] top-[25px] h-1.5 w-1.5 rounded-full bg-primary/70 ring-2 ring-background" />
          </div>
        )}

        {/* Horizontal Node Card */}
        <div
          className={cn(
            "relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4 rounded-xl border border-border/60 bg-card p-4 shadow-xs transition-all hover:border-border hover:bg-card/90 hover:shadow-sm",
            depth === 0 && "border-border/80 bg-card/95"
          )}
        >
          {/* Left Column: Expand button, Icon, Metadata */}
          <div className="flex items-start md:items-center gap-3 min-w-0 flex-1">
            {/* Expand / Collapse Control */}
            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggleNodeExpand(node._id)}
                aria-expanded={isExpanded}
                className="mt-1 md:mt-0 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                title={isExpanded ? "Collapse children" : "Expand children"}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            ) : (
              <div className="w-7 shrink-0" />
            )}

            {/* Entity Icon Container */}
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border shadow-xs",
                kindConfig.iconBoxStyle
              )}
            >
              <IconComponent className="h-5 w-5" />
            </div>

            {/* Main Info */}
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-foreground text-sm sm:text-base tracking-tight truncate">
                  {node.name}
                </h3>
                <span className="font-mono text-[11px] font-bold uppercase rounded bg-muted/80 px-1.5 py-0.5 text-muted-foreground border border-border/40">
                  {node.code}
                </span>

                {/* Entity Kind Badge */}
                <span
                  className={cn(
                    "rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                    kindConfig.badgeStyle
                  )}
                >
                  {kindConfig.label}
                </span>

                {/* Top Parent Badge */}
                {depth === 0 && node.kind === "holding" && (
                  <span className="rounded-md border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-400">
                    PARENT
                  </span>
                )}

                {/* Primary HQ Indicator */}
                {node.isPrimary && (
                  <span className="flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" /> PRIMARY HQ
                  </span>
                )}
              </div>

              {/* Sub Metadata Row */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>
                  Base Currency:{" "}
                  <strong className="font-semibold text-foreground">{node.baseCurrency}</strong>
                </span>
                <span className="text-border">•</span>
                <span>
                  Tax ID:{" "}
                  <span className="font-mono text-foreground/80">
                    {node.taxId || "Not Registered"}
                  </span>
                </span>
                {node.branding?.invoicePrefix && (
                  <>
                    <span className="text-border">•</span>
                    <span>
                      Prefix:{" "}
                      <span className="font-mono text-muted-foreground">
                        {node.branding.invoicePrefix}
                      </span>
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Operational Metrics & Contextual Action Menu */}
          <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto border-t md:border-t-0 border-border/40 pt-3 md:pt-0">
            {/* Operational Metrics */}
            <div className="flex items-center gap-5 text-center text-xs">
              <div>
                <div className="font-semibold text-foreground text-sm">
                  {node.children ? node.children.length : 0}
                </div>
                <div className="text-[10px] text-muted-foreground uppercase font-medium">
                  {node.kind === "holding" ? "Subsidiaries" : "Branches"}
                </div>
              </div>
              <div className="h-6 w-px bg-border/40" />
              <div>
                <div className="font-semibold text-foreground text-sm">{node.baseCurrency}</div>
                <div className="text-[10px] text-muted-foreground uppercase font-medium">
                  Currency
                </div>
              </div>
              <div className="h-6 w-px bg-border/40" />
              <div>
                <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
                  Active
                </span>
              </div>
            </div>

            {/* Contextual Action Menu (•••) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setActiveMenuId(isMenuOpen ? null : node._id)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                aria-label="Actions menu"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>

              {isMenuOpen && (
                <div className="absolute right-0 top-9 z-30 w-48 rounded-xl border border-border/80 bg-card p-1.5 shadow-xl space-y-0.5 animate-in fade-in-50 zoom-in-95">
                  <button
                    type="button"
                    onClick={() => openModalForEdit(node, "general")}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors text-left"
                  >
                    <Edit2 className="h-3.5 w-3.5 text-muted-foreground" /> Edit Company
                  </button>

                  <button
                    type="button"
                    onClick={() => openModalForCreate("branch", node._id)}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors text-left"
                  >
                    <Plus className="h-3.5 w-3.5 text-primary" /> Add Branch / Child
                  </button>

                  <button
                    type="button"
                    onClick={() => openModalForEdit(node, "branding")}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors text-left"
                  >
                    <FileText className="h-3.5 w-3.5 text-blue-400" /> Manage Branding
                  </button>

                  {!node.isPrimary && (
                    <>
                      <div className="my-1 border-t border-border/60" />
                      <button
                        type="button"
                        onClick={() => handleDeleteCompany(node._id, node.name)}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors text-left"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete Company
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Children Container with Vertical Tree Connection Stem */}
        {hasChildren && isExpanded && (
          <div className="relative ml-6 sm:ml-8 pl-6 sm:pl-8 space-y-3 pt-3">
            {/* Vertical stem from parent card down through children */}
            <div className="absolute left-0 top-0 bottom-6 w-0.5 bg-border/60" />
            {node.children.map((childNode, idx) => (
              <TreeNodeCard
                key={childNode._id}
                node={childNode}
                depth={depth + 1}
                isLast={idx === node.children.length - 1}
                hasParent={true}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2 flex-wrap">
            <Network className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />
            <span>Company Hierarchy & Branding</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Manage your parent holding group, operating companies, international branches, and custom document branding.
          </p>
        </div>

        {/* Primary Action Button with Creation Type Dropdown */}
        <div className="relative shrink-0 w-full sm:w-auto" ref={addDropdownRef}>
          <div className="inline-flex w-full sm:w-auto rounded-xl bg-primary shadow-md shadow-primary/20 transition-all hover:bg-primary/90 justify-between">
            <button
              type="button"
              onClick={() => openModalForCreate("operating")}
              className="flex items-center justify-center gap-2 flex-1 sm:flex-initial px-4 py-2 text-xs sm:text-sm font-semibold text-primary-foreground"
            >
              <Plus className="h-4 w-4" /> Add Company
            </button>
            <button
              type="button"
              onClick={() => setAddDropdownOpen(!addDropdownOpen)}
              className="border-l border-primary-foreground/20 px-3 py-2 text-primary-foreground hover:bg-primary-foreground/10 rounded-r-xl transition-colors shrink-0"
              aria-label="More creation options"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>

          {addDropdownOpen && (
            <div className="absolute right-0 top-12 z-30 w-56 rounded-xl border border-border/80 bg-card p-1.5 shadow-xl space-y-1 animate-in fade-in-50 zoom-in-95">
              <button
                type="button"
                onClick={() => openModalForCreate("holding")}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors text-left"
              >
                <Globe className="h-4 w-4 text-purple-400" />
                <div>
                  <div className="font-semibold">Holding Company</div>
                  <div className="text-[10px] text-muted-foreground">Parent ownership entity</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => openModalForCreate("operating")}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors text-left"
              >
                <Briefcase className="h-4 w-4 text-blue-400" />
                <div>
                  <div className="font-semibold">Operating Company</div>
                  <div className="text-[10px] text-muted-foreground">Primary operational entity</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => openModalForCreate("branch")}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors text-left"
              >
                <GitBranch className="h-4 w-4 text-amber-400" />
                <div>
                  <div className="font-semibold">Regional Branch</div>
                  <div className="text-[10px] text-muted-foreground">Subordinate local unit</div>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Alert Message */}
      {message && (
        <div
          className={cn(
            "flex items-center justify-between rounded-xl border p-4 text-sm font-medium transition-all",
            message.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          )}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{message.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="text-xs opacity-70 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 2. Executive Summary Bar (Real Data) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="rounded-xl border border-border/60 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Total Companies</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">{totalCompanies}</div>
          <p className="mt-1 text-[11px] text-muted-foreground truncate">
            {holdingCount} holding · {operatingCount} operating · {branchCount} branch
          </p>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Total Branches</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
              <GitBranch className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">{branchCount}</div>
          <p className="mt-1 text-[11px] text-muted-foreground truncate">
            Across {operatingCount + holdingCount} parent entities
          </p>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Currencies</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
              <Globe className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">{uniqueCurrencies.length}</div>
          <p className="mt-1 text-[11px] text-muted-foreground truncate">
            {uniqueCurrencies.length > 0 ? uniqueCurrencies.join(", ") : "AED"} currencies
          </p>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Active Companies</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">{activeCount}</div>
          <p className="mt-1 text-[11px] text-muted-foreground truncate">
            {activeCount === totalCompanies
              ? "All companies operational"
              : `${activeCount} of ${totalCompanies} active`}
          </p>
        </div>
      </div>

      {/* 3. View Switcher & Hierarchy Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-1.5 bg-muted/40 p-1 rounded-xl border border-border/60">
          <button
            type="button"
            onClick={() => setActiveTab("tree")}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
              activeTab === "tree"
                ? "bg-card text-foreground font-semibold shadow-xs border border-border/40"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Network className="h-3.5 w-3.5 text-primary" /> Hierarchy View
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("list")}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
              activeTab === "list"
                ? "bg-card text-foreground font-semibold shadow-xs border border-border/40"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Layers className="h-3.5 w-3.5 text-blue-400" /> Table View ({companies.length})
          </button>
        </div>

        {/* Tree Expand / Collapse Controls (Only visible in Hierarchy View) */}
        {activeTab === "tree" && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExpandAll}
              className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-card px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Maximize2 className="h-3.5 w-3.5" /> Expand All
            </button>
            <button
              type="button"
              onClick={handleCollapseAll}
              className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-card px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Minimize2 className="h-3.5 w-3.5" /> Collapse All
            </button>
          </div>
        )}
      </div>

      {/* 4. Hierarchy Tree / Flat Table Content */}
      {loading ? (
        /* Loading Skeleton */
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 w-full animate-pulse rounded-xl border border-border/40 bg-card/40 p-4"
            />
          ))}
        </div>
      ) : activeTab === "tree" ? (
        <div className="space-y-4">
          {tree.length === 0 ? (
            /* 17. Empty State */
            <div className="rounded-2xl border border-dashed border-border/80 bg-card/40 p-12 text-center space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Network className="h-6 w-6" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-base font-semibold text-foreground">
                  No corporate hierarchy configured
                </h3>
                <p className="text-xs text-muted-foreground">
                  Create your holding group or operating entity to establish your enterprise corporate structure.
                </p>
              </div>
              <button
                type="button"
                onClick={() => openModalForCreate("holding")}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-md hover:bg-primary/90 transition-all"
              >
                <Plus className="h-4 w-4" /> Create Holding Company
              </button>
            </div>
          ) : (
            <div className="space-y-4 pt-1">
              {tree.map((rootNode) => (
                <TreeNodeCard key={rootNode._id} node={rootNode} depth={0} />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* 14. Flat Table View */
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border/60 bg-muted/40 font-semibold uppercase text-muted-foreground tracking-wider">
                <tr>
                  <th className="px-4 py-3.5">Company & Code</th>
                  <th className="px-4 py-3.5">Type</th>
                  <th className="px-4 py-3.5">Parent Entity</th>
                  <th className="px-4 py-3.5">Currency</th>
                  <th className="px-4 py-3.5">Tax Registration</th>
                  <th className="px-4 py-3.5">Primary HQ</th>
                  <th className="px-4 py-3.5">Branding Prefixes</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {companies.map((comp) => (
                  <tr key={comp._id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-foreground">{comp.name}</div>
                      <div className="font-mono text-[11px] text-primary">{comp.code}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={cn(
                          "rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                          comp.kind === "holding" && "bg-purple-500/10 text-purple-400 border-purple-500/20",
                          comp.kind === "operating" && "bg-blue-500/10 text-blue-400 border-blue-500/20",
                          comp.kind === "branch" && "bg-amber-500/10 text-amber-400 border-amber-500/20",
                          comp.kind === "division" && "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        )}
                      >
                        {comp.kind}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-medium text-muted-foreground">
                      {getParentName(comp.parentCompanyId)}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-foreground">
                      {comp.baseCurrency}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-muted-foreground">
                      {comp.taxId || "N/A"}
                    </td>
                    <td className="px-4 py-3.5">
                      {comp.isPrimary ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="h-3 w-3" /> Yes
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-[11px] text-muted-foreground">
                      Inv: {comp.branding?.invoicePrefix || `${comp.code}-INV`}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openModalForEdit(comp, "general")}
                          className="rounded-lg border border-border/60 px-2.5 py-1 text-xs font-medium hover:bg-muted transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => openModalForEdit(comp, "branding")}
                          className="rounded-lg border border-border/60 px-2.5 py-1 text-xs font-medium text-blue-400 hover:bg-muted transition-colors"
                        >
                          Branding
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 12. Brand Identity & Document Branding Section */}
      <div className="mt-8 border-t border-border/60 pt-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" /> Brand Identity & Document Prefixes
            </h2>
            <p className="text-xs text-muted-foreground">
              Configure logos, digital signatures, company seals, and serial prefixes for invoices, quotations, and POs per entity.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {companies.map((comp) => {
            const hasLogo = !!(comp.branding?.logoUrl || comp.branding?.logoText);
            const hasSeal = !!comp.branding?.companySealUrl;
            const hasFooter = !!comp.branding?.invoiceFooter;

            return (
              <div
                key={comp._id}
                className="rounded-xl border border-border/60 bg-card p-4 space-y-3 shadow-xs hover:border-border transition-colors"
              >
                <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="font-semibold text-foreground text-sm">{comp.name}</div>
                    <span className="font-mono text-[10px] font-bold rounded bg-muted px-1.5 py-0.5 text-muted-foreground">
                      {comp.code}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openModalForEdit(comp, "branding")}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    Edit
                  </button>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Logo / Header:</span>
                    <span
                      className={cn(
                        "font-medium px-2 py-0.5 rounded text-[10px]",
                        hasLogo
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {hasLogo ? "Configured" : "Not Set"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Invoice Prefix:</span>
                    <span className="font-mono font-semibold text-foreground">
                      {comp.branding?.invoicePrefix || `${comp.code}-INV`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Quotation Prefix:</span>
                    <span className="font-mono font-semibold text-foreground">
                      {comp.branding?.quotationPrefix || `${comp.code}-QT`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Company Seal:</span>
                    <span
                      className={cn(
                        "font-medium px-2 py-0.5 rounded text-[10px]",
                        hasSeal
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {hasSeal ? "Uploaded" : "Not Set"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 13. Hierarchy Architecture Overview Card */}
      <div className="mt-8 rounded-xl border border-border/60 bg-muted/20 p-4 sm:p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-foreground text-sm">Hierarchy Architecture Overview</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="space-y-1">
            <span className="font-bold text-purple-400 uppercase text-[10px] tracking-wider block">
              Holding Group
            </span>
            <p className="text-muted-foreground leading-relaxed">
              Top-level parent holding company. Owns and controls operational entities across regions.
            </p>
          </div>

          <div className="space-y-1">
            <span className="font-bold text-blue-400 uppercase text-[10px] tracking-wider block">
              Operating Entity
            </span>
            <p className="text-muted-foreground leading-relaxed">
              Primary business unit handling trade, invoices, and direct commercial contracts.
            </p>
          </div>

          <div className="space-y-1">
            <span className="font-bold text-amber-400 uppercase text-[10px] tracking-wider block">
              Regional Branch
            </span>
            <p className="text-muted-foreground leading-relaxed">
              Local operating office or branch subordinate to an operating company.
            </p>
          </div>

          <div className="space-y-1">
            <span className="font-bold text-emerald-400 uppercase text-[10px] tracking-wider block">
              Primary HQ
            </span>
            <p className="text-muted-foreground leading-relaxed">
              Main global headquarters designated for default consolidated transactions.
            </p>
          </div>
        </div>
      </div>

      {/* 16. Modal for Creating / Editing Companies & Branding */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-5 overflow-hidden">
          <div className="w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl border border-border bg-card shadow-2xl animate-in fade-in-50 zoom-in-95 my-auto overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border/60 px-6 py-4 shrink-0 bg-card">
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  {editingCompany ? `Edit Entity: ${editingCompany.name}` : "Create Corporate Entity"}
                </h2>
                <p className="text-xs text-muted-foreground">
                  Define entity type, parent relationships, currency, and custom document branding.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground text-sm font-semibold transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-border/40 px-6 py-2.5 shrink-0 bg-muted/20">
              <button
                type="button"
                onClick={() => setModalTab("general")}
                className={cn(
                  "rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors flex items-center gap-1.5",
                  modalTab === "general"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Building2 className="h-3.5 w-3.5" />
                General & Hierarchy
              </button>
              <button
                type="button"
                onClick={() => setModalTab("branding")}
                className={cn(
                  "rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors flex items-center gap-1.5",
                  modalTab === "branding"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <FileText className="h-3.5 w-3.5" />
                Branding & Document Prefixes
              </button>
            </div>

            {/* Form Content */}
            <form onSubmit={handleSaveCompany} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
                {modalTab === "general" ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-medium mb-1 text-foreground">Company Name *</label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full rounded-lg border border-border/80 bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="e.g. Docutrade Middle East LLC"
                        />
                      </div>

                      <div>
                        <label className="block font-medium mb-1 text-foreground">
                          Unique Code (3-8 Chars) *
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={8}
                          value={formData.code}
                          onChange={(e) =>
                            setFormData({ ...formData, code: e.target.value.toUpperCase() })
                          }
                          className="w-full font-mono rounded-lg border border-border/80 bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary uppercase"
                          placeholder="e.g. SDT-DXB"
                        />
                      </div>

                      <div>
                        <label className="block font-medium mb-1 text-foreground">Entity Kind *</label>
                        <Dropdown
                          value={formData.kind}
                          onValueChange={(val) => {
                            const newKind = val as any;
                            setFormData({
                              ...formData,
                              kind: newKind,
                              parentCompanyId: newKind === "holding" ? "" : formData.parentCompanyId,
                            });
                          }}
                          options={[
                            { value: "holding", label: "Holding Group (Parent)", badge: "HOLDING", description: "Top-level parent corporate entity" },
                            { value: "operating", label: "Operating Company", badge: "OPERATING", description: "Main business operating unit" },
                            { value: "branch", label: "Branch (Regional Office)", badge: "BRANCH", description: "Regional branch office" },
                            { value: "division", label: "Division / Subsidiary", badge: "DIVISION", description: "Sub-entity or business unit" },
                          ]}
                        />
                      </div>

                      <div>
                        <label className="block font-medium mb-1 text-foreground">
                          Parent Entity {formData.kind === "holding" && "(N/A for Holding)"}
                        </label>
                        <Dropdown
                          disabled={formData.kind === "holding"}
                          value={formData.parentCompanyId}
                          onValueChange={(val) => setFormData({ ...formData, parentCompanyId: val })}
                          placeholder="None (Top-Level Parent)"
                          searchable={true}
                          options={[
                            { value: "", label: "None (Top-Level Parent)" },
                            ...companies
                              .filter((c) => c._id !== editingCompany?._id)
                              .map((c) => ({
                                value: c._id,
                                label: `${c.name} (${c.code})`,
                                badge: c.kind.toUpperCase(),
                              })),
                          ]}
                        />
                      </div>

                      <div>
                        <label className="block font-medium mb-1 text-foreground">Base Currency *</label>
                        <Dropdown
                          value={formData.baseCurrency}
                          onValueChange={(val) => setFormData({ ...formData, baseCurrency: val })}
                          options={[
                            { value: "AED", label: "AED - UAE Dirham" },
                            { value: "USD", label: "USD - US Dollar" },
                            { value: "EUR", label: "EUR - Euro" },
                            { value: "GBP", label: "GBP - British Pound" },
                            { value: "INR", label: "INR - Indian Rupee" },
                            { value: "AUD", label: "AUD - Australian Dollar" },
                            { value: "SAR", label: "SAR - Saudi Riyal" },
                            { value: "QAR", label: "QAR - Qatari Riyal" },
                          ]}
                        />
                      </div>

                      <div>
                        <label className="block font-medium mb-1 text-foreground">
                          Tax Registration / TRN / VAT ID
                        </label>
                        <input
                          type="text"
                          value={formData.taxId}
                          onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                          className="w-full font-mono rounded-lg border border-border/80 bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="e.g. 100234567800003"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-border/40 pt-3">
                      <div>
                        <label className="block font-medium mb-1 text-foreground">Official Email</label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full rounded-lg border border-border/80 bg-background px-3 py-2 text-foreground"
                          placeholder="contact@company.com"
                        />
                      </div>

                      <div>
                        <label className="block font-medium mb-1 text-foreground">Phone Number</label>
                        <input
                          type="text"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full rounded-lg border border-border/80 bg-background px-3 py-2 text-foreground"
                          placeholder="+971 4 123 4567"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 border-t border-border/40 pt-3">
                      <input
                        type="checkbox"
                        id="isPrimaryCheck"
                        checked={formData.isPrimary}
                        onChange={(e) => setFormData({ ...formData, isPrimary: e.target.checked })}
                        className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                      />
                      <label
                        htmlFor="isPrimaryCheck"
                        className="font-semibold text-foreground cursor-pointer"
                      >
                        Set as Primary Headquarter Entity
                      </label>
                    </div>
                  </div>
                ) : (
                  /* Branding Tab */
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-medium mb-1 text-foreground">
                          Invoice Prefix
                        </label>
                        <input
                          type="text"
                          value={formData.invoicePrefix}
                          onChange={(e) =>
                            setFormData({ ...formData, invoicePrefix: e.target.value })
                          }
                          className="w-full font-mono rounded-lg border border-border/80 bg-background px-2.5 py-1.5 text-foreground"
                          placeholder="e.g. SDT-INV-"
                        />
                      </div>
                      <div>
                        <label className="block font-medium mb-1 text-foreground">
                          Quotation Prefix
                        </label>
                        <input
                          type="text"
                          value={formData.quotationPrefix}
                          onChange={(e) =>
                            setFormData({ ...formData, quotationPrefix: e.target.value })
                          }
                          className="w-full font-mono rounded-lg border border-border/80 bg-background px-2.5 py-1.5 text-foreground"
                          placeholder="e.g. SDT-QT-"
                        />
                      </div>
                      <div>
                        <label className="block font-medium mb-1 text-foreground">PO Prefix</label>
                        <input
                          type="text"
                          value={formData.poPrefix}
                          onChange={(e) => setFormData({ ...formData, poPrefix: e.target.value })}
                          className="w-full font-mono rounded-lg border border-border/80 bg-background px-2.5 py-1.5 text-foreground"
                          placeholder="e.g. SDT-PO-"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-border/40 pt-4">
                      <div className="space-y-2">
                        <UploadCard
                          compact={true}
                          label="Company Logo"
                          value={formData.logoUrl}
                          onChange={(val) => setFormData((prev) => ({ ...prev, logoUrl: val, logoText: val }))}
                          placeholder="Upload logo (PNG, JPG, SVG)"
                        />
                        <div>
                          <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                            Direct Logo URL / Base64 (Optional)
                          </label>
                          <input
                            type="text"
                            value={formData.logoUrl}
                            onChange={(e) => setFormData((prev) => ({ ...prev, logoUrl: e.target.value, logoText: e.target.value }))}
                            className="w-full rounded-lg border border-border/80 bg-background px-2.5 py-1.5 text-xs text-foreground"
                            placeholder="https://... or data:image/png..."
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <UploadCard
                          compact={true}
                          label="Authorized Signature"
                          value={formData.signatureUrl}
                          onChange={(val) => setFormData((prev) => ({ ...prev, signatureUrl: val, signatureText: val }))}
                          placeholder="Upload authorized signature"
                        />
                        <div>
                          <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                            Direct Signature URL / Base64 (Optional)
                          </label>
                          <input
                            type="text"
                            value={formData.signatureUrl}
                            onChange={(e) => setFormData((prev) => ({ ...prev, signatureUrl: e.target.value, signatureText: e.target.value }))}
                            className="w-full rounded-lg border border-border/80 bg-background px-2.5 py-1.5 text-xs text-foreground"
                            placeholder="https://... signature image"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <UploadCard
                          compact={true}
                          label="Company Stamp / Seal"
                          value={formData.companySealUrl}
                          onChange={(val) => setFormData((prev) => ({ ...prev, companySealUrl: val }))}
                          placeholder="Upload official stamp or seal image"
                        />
                        <div>
                          <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                            Direct Seal URL / Base64 (Optional)
                          </label>
                          <input
                            type="text"
                            value={formData.companySealUrl}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, companySealUrl: e.target.value }))
                            }
                            className="w-full rounded-lg border border-border/80 bg-background px-2.5 py-1.5 text-xs text-foreground"
                            placeholder="https://... official stamp image"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 border-t border-border/40 pt-3">
                      <div>
                        <label className="block font-medium mb-1 text-foreground">
                          Invoice Footer / Terms
                        </label>
                        <textarea
                          rows={2}
                          value={formData.invoiceFooter}
                          onChange={(e) =>
                            setFormData({ ...formData, invoiceFooter: e.target.value })
                          }
                          className="w-full rounded-lg border border-border/80 bg-background px-2.5 py-1.5 text-foreground"
                          placeholder="Thank you for your business. Payment due within 30 days."
                        />
                      </div>

                      <div>
                        <label className="block font-medium mb-1 text-foreground">
                          Bank Details Text
                        </label>
                        <textarea
                          rows={2}
                          value={formData.bankDetailsText}
                          onChange={(e) =>
                            setFormData({ ...formData, bankDetailsText: e.target.value })
                          }
                          className="w-full rounded-lg border border-border/80 bg-background px-2.5 py-1.5 text-foreground"
                          placeholder="Bank Name: Emirates NBD | IBAN: AE0000000000000000000"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer Buttons */}
              <div className="flex items-center justify-end gap-2 border-t border-border/60 px-6 py-3.5 shrink-0 bg-muted/30">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-border/60 px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground shadow-md hover:bg-primary/90 transition-all disabled:opacity-50"
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
