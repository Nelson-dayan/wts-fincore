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

    const context = await CompanyHierarchyService.resolveCompanyContext(activeId, authContext.scopeMode);

    return NextResponse.json({
      tree,
      companies: userCompanies,
      context,
      canAccessGroupView: authContext.canAccessGroupView,
      canManageGroup: authContext.canManageGroup,
      isSuperAdmin,
    });
  } catch (error) {
    return authErrorResponse(error, "Failed to load company hierarchy");
  }
}
