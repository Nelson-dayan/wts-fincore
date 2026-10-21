import { NextResponse, type NextRequest } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { connectDB } from "@/lib/db/connect";
import { CompanyModel } from "@/lib/db/models";
import { authErrorResponse } from "@/lib/api/route-auth";
import { resolveAuthCompanyContext } from "@/lib/auth/company-context";

export async function GET(req: NextRequest) {
  try {
    const session = await requireRole(["admin", "employee"]);
    await connectDB();

    const targetCompanyId = req.headers.get("x-company-id");
    const scopeMode = (req.headers.get("x-scope-mode") as "single" | "group") || "single";

    const companyContext = await resolveAuthCompanyContext(session.user, targetCompanyId, scopeMode);

    const items = await CompanyModel.find({
      _id: { $in: companyContext.allowedCompanyIds },
      isActive: true,
      deletedAt: null,
    })
      .select("_id name code kind isPrimary baseCurrency branding")
      .sort({ isPrimary: -1, name: 1 })
      .lean();

    return NextResponse.json({ items, context: companyContext });
  } catch (error) {
    return authErrorResponse(error, "Failed to load company options");
  }
}
