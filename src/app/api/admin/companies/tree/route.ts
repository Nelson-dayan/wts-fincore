import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { requireSession } from "@/lib/auth/require-role";
import { authErrorResponse } from "@/lib/api/route-auth";
import { CompanyHierarchyService } from "@/lib/services/business/company-hierarchy.service";
import { CompanyModel } from "@/lib/db/models";
import { connectDB } from "@/lib/db/connect";
import { resolveAuthCompanyContext } from "@/lib/auth/company-context";

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    await connectDB();

    const { searchParams } = new URL(req.url);
    const rawActiveId = searchParams.get("activeId");
    const activeId = rawActiveId ? rawActiveId.trim() : null;
    const scopeMode = (searchParams.get("scopeMode") as "single" | "group") || "single";

    // 1. Validate activeId format if supplied
    if (activeId) {
      if (!Types.ObjectId.isValid(activeId)) {
        return NextResponse.json(
          { message: "Invalid company ID format", code: "INVALID_COMPANY_ID" },
          { status: 400 }
        );
      }
    }

    const authContext = await resolveAuthCompanyContext(session.user, activeId, scopeMode);
    const isSuperAdmin = authContext.globalRole === "super_admin";
    const allowedIds = (authContext.userAssignedCompanyIds || []).map((id) => id.toString());

    // 2. Authorize activeId against permitted tenant scope for non-super-admins
    if (activeId && !isSuperAdmin && !allowedIds.includes(activeId)) {
      return NextResponse.json(
        {
          message: "Unauthorized company access: requested company is outside your authorized tenant scope",
          code: "COMPANY_ACCESS_DENIED",
        },
        { status: 403 }
      );
    }

    const scopedTreeIds = isSuperAdmin
      ? undefined
      : (allowedIds.length > 0 ? allowedIds : authContext.allowedCompanyIds);

    const tree = await CompanyHierarchyService.getCompanyTree(scopedTreeIds);

    // 3. Database-level company scoping to prevent foreign tenant memory/data exposure
    const companyQuery: Record<string, any> = { isActive: true, deletedAt: null };
    if (!isSuperAdmin) {
      companyQuery._id = { $in: allowedIds.map((id) => new Types.ObjectId(id)) };
    }

    const userCompanies = await CompanyModel.find(companyQuery)
      .select("name code kind parentCompanyId taxId baseCurrency branding isActive isPrimary")
      .sort({ name: 1 })
      .lean();

    // 4. Resolve context strictly using authorized company ID
    const targetContextId = isSuperAdmin
      ? (activeId || authContext.activeCompanyId)
      : authContext.activeCompanyId;

    function filterTree<T extends { _id: { toString(): string }; children?: T[] }>(
      nodes: T[],
      allowedSet: Set<string>
    ): T[] {
      const result: T[] = [];
      for (const node of nodes) {
        const filteredChildren = filterTree(node.children || [], allowedSet);
        if (allowedSet.has(node._id.toString()) || filteredChildren.length > 0) {
          result.push({
            ...node,
            children: filteredChildren,
          });
        }
      }
      return result;
    }

    const filteredTree = isSuperAdmin ? tree : filterTree(tree, new Set(allowedIds));
    const context = await CompanyHierarchyService.resolveCompanyContext(targetContextId, authContext.scopeMode);

    // 5. Ensure context metadata never contains foreign tenant company IDs
    if (!isSuperAdmin) {
      context.allowedCompanyIds = context.allowedCompanyIds.filter((cid) =>
        allowedIds.includes(cid.toString())
      );
    }

    const sanitizedContext = {
      ...context,
      allowedCompanyIds: authContext.allowedCompanyIds,
      availableIssuingCompanies: isSuperAdmin
        ? context.availableIssuingCompanies
        : context.availableIssuingCompanies.filter((c) => allowedIds.includes(c._id.toString())),
    };

    return NextResponse.json({
      tree: filteredTree,
      companies: userCompanies,
      context: sanitizedContext,
      canAccessGroupView: authContext.canAccessGroupView,
      canManageGroup: authContext.canManageGroup,
      isSuperAdmin,
    });
  } catch (error) {
    return authErrorResponse(error, "Failed to load company hierarchy");
  }
}
