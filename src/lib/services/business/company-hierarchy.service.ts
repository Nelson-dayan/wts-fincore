import { Types } from "mongoose";
import { CompanyModel } from "@/lib/db/models/company.model";
import { connectDB } from "@/lib/db/connect";

export interface CompanyTreeNode {
  _id: string;
  name: string;
  code: string;
  kind: "holding" | "operating" | "branch" | "division";
  parentCompanyId: string | null;
  taxId: string;
  baseCurrency: string;
  branding?: {
    logoUrl?: string;
    logoText?: string;
    signatureUrl?: string;
    companySealUrl?: string;
    invoicePrefix?: string;
  };
  isActive: boolean;
  isPrimary: boolean;
  children: CompanyTreeNode[];
}

export interface CompanyContextResult {
  companyId: Types.ObjectId;
  scopeMode: "single" | "group";
  allowedCompanyIds: Types.ObjectId[];
  activeCompany: {
    _id: string;
    name: string;
    code: string;
    kind: string;
    parentCompanyId: string | null;
    baseCurrency: string;
    isPrimary: boolean;
  };
  availableIssuingCompanies: Array<{
    _id: string;
    name: string;
    code: string;
    kind: string;
    isPrimary: boolean;
    baseCurrency: string;
  }>;
}

export class CompanyHierarchyService {
  /**
   * Fetches full hierarchical tree of active companies.
   */
  static async getCompanyTree(): Promise<CompanyTreeNode[]> {
    await connectDB();
    
    let companies = await CompanyModel.find({ isActive: true, deletedAt: null })
      .select("name code kind parentCompanyId taxId baseCurrency branding isActive isPrimary")
      .lean();

    if (companies.length === 0) {
      await this.resolveCompanyContext();
      companies = await CompanyModel.find({ isActive: true, deletedAt: null })
        .select("name code kind parentCompanyId taxId baseCurrency branding isActive isPrimary")
        .lean();
    }

    const companyMap = new Map<string, CompanyTreeNode>();
    const roots: CompanyTreeNode[] = [];

    // Initialize nodes
    for (const c of companies) {
      const node: CompanyTreeNode = {
        _id: c._id.toString(),
        name: c.name,
        code: c.code || "COMP",
        kind: c.kind || "operating",
        parentCompanyId: c.parentCompanyId ? c.parentCompanyId.toString() : null,
        taxId: c.taxId || "",
        baseCurrency: c.baseCurrency || "AED",
        branding: c.branding,
        isActive: c.isActive,
        isPrimary: c.isPrimary,
        children: [],
      };
      companyMap.set(node._id, node);
    }

    // Build parent-child hierarchy
    for (const node of companyMap.values()) {
      if (node.parentCompanyId && companyMap.has(node.parentCompanyId)) {
        companyMap.get(node.parentCompanyId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  /**
   * Recursively fetches all descendant company ObjectIds under a given company.
   */
  static async getDescendantCompanyIds(companyIdStr: string): Promise<Types.ObjectId[]> {
    await connectDB();
    
    const companyId = new Types.ObjectId(companyIdStr);
    const results: Types.ObjectId[] = [companyId];

    const queue: Types.ObjectId[] = [companyId];
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const children = await CompanyModel.find({
        parentCompanyId: currentId,
        isActive: true,
        deletedAt: null,
      }).select("_id").lean();

      for (const child of children) {
        results.push(child._id);
        queue.push(child._id);
      }
    }

    return results;
  }

  /**
   * Resolves fail-fast company context.
   * If companyId is missing, raises an explicit error (no silent fallback).
   */
  static async resolveCompanyContext(
    targetCompanyIdStr?: string | null,
    scopeMode: "single" | "group" = "single"
  ): Promise<CompanyContextResult> {
    await connectDB();

    let companyDoc;
    if (targetCompanyIdStr && Types.ObjectId.isValid(targetCompanyIdStr)) {
      companyDoc = await CompanyModel.findOne({ _id: targetCompanyIdStr, isActive: true, deletedAt: null }).lean();
    }

    // If target not supplied, find primary active company as explicit fallback
    if (!companyDoc) {
      companyDoc = await CompanyModel.findOne({ isPrimary: true, isActive: true, deletedAt: null }).lean();
    }

    if (!companyDoc) {
      companyDoc = await CompanyModel.findOne({ isActive: true, deletedAt: null }).lean();
    }

    if (!companyDoc) {
      companyDoc = await CompanyModel.findOne({ deletedAt: null }).lean();
      if (companyDoc && !companyDoc.isActive) {
        await CompanyModel.updateOne({ _id: companyDoc._id }, { $set: { isActive: true } });
        companyDoc.isActive = true;
      }
    }

    if (!companyDoc) {
      const created = await CompanyModel.create({
        name: "Default Company",
        code: "MAIN",
        kind: "operating",
        baseCurrency: "AED",
        isActive: true,
        isPrimary: true,
      });
      companyDoc = created.toObject();
    }

    const companyId = companyDoc._id;
    let allowedCompanyIds: Types.ObjectId[] = [companyId];

    if (scopeMode === "group") {
      allowedCompanyIds = await this.getDescendantCompanyIds(companyId.toString());
    }

    const availableIssuingCompaniesDocs = await CompanyModel.find({
      _id: { $in: allowedCompanyIds },
      isActive: true,
      deletedAt: null,
    })
      .select("_id name code kind isPrimary baseCurrency")
      .lean();

    const availableIssuingCompanies = availableIssuingCompaniesDocs.map((c) => ({
      _id: c._id.toString(),
      name: c.name,
      code: c.code || "COMP",
      kind: c.kind || "operating",
      isPrimary: Boolean(c.isPrimary),
      baseCurrency: c.baseCurrency || "AED",
    }));

    return {
      companyId,
      scopeMode,
      allowedCompanyIds,
      activeCompany: {
        _id: companyDoc._id.toString(),
        name: companyDoc.name,
        code: companyDoc.code || "COMP",
        kind: companyDoc.kind || "operating",
        parentCompanyId: companyDoc.parentCompanyId ? companyDoc.parentCompanyId.toString() : null,
        baseCurrency: companyDoc.baseCurrency || "AED",
        isPrimary: Boolean(companyDoc.isPrimary),
      },
      availableIssuingCompanies,
    };
  }
}
