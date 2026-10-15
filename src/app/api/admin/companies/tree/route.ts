import { NextResponse } from "next/server";
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
    const activeId = searchParams.get("activeId");
    const scopeMode = (searchParams.get("scopeMode") as "single" | "group") || "single";

    const authContext = await resolveAuthCompanyContext(session.user, activeId, scopeMode);

    const tree = await CompanyHierarchyService.getCompanyTree();
    const flatCompanies = await CompanyModel.find({ isActive: true, deletedAt: null })
      .select("name code kind parentCompanyId taxId baseCurrency branding isActive isPrimary")
      .sort({ name: 1 })
      .lean();

    const isSuperAdmin = authContext.globalRole === "super_admin";
    const allowedIds = authContext.userAssignedCompanyIds || [];
    const userCompanies = isSuperAdmin
      ? flatCompanies
      : flatCompanies.filter((c) => allowedIds.includes(c._id.toString()));

    function filterTree(nodes: any[], allowedSet: Set<string>): any[] {
      const result: any[] = [];
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
    const context = await CompanyHierarchyService.resolveCompanyContext(activeId, authContext.scopeMode);

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
