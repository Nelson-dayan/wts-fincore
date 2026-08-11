import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { authErrorResponse } from "@/lib/api/route-auth";
import { CompanyHierarchyService } from "@/lib/services/business/company-hierarchy.service";
import { CompanyModel } from "@/lib/db/models";
import { connectDB } from "@/lib/db/connect";

export async function GET(req: Request) {
  try {
    await requireRole(["admin", "employee"]);
    await connectDB();

    const { searchParams } = new URL(req.url);
    const activeId = searchParams.get("activeId");
    const scopeMode = (searchParams.get("scopeMode") as "single" | "group") || "single";

    const tree = await CompanyHierarchyService.getCompanyTree();
    const flatCompanies = await CompanyModel.find({ isActive: true, deletedAt: null })
      .select("name code kind parentCompanyId taxId baseCurrency branding isActive isPrimary")
      .sort({ name: 1 })
      .lean();

    const context = await CompanyHierarchyService.resolveCompanyContext(activeId, scopeMode);

    return NextResponse.json({
      tree,
      companies: flatCompanies,
      context,
    });
  } catch (error) {
    return authErrorResponse(error, "Failed to load company hierarchy");
  }
}
