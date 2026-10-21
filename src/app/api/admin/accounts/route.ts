import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { connectDB } from "@/lib/db/connect";
import { AccountModel, CompanyModel } from "@/lib/db/models";
import { authErrorResponse } from "@/lib/api/route-auth";
import { resolveAuthCompanyContext } from "@/lib/auth/company-context";

export async function GET(req: Request) {
  try {
    const session = await requireRole(["admin", "employee"]);
    await connectDB();
    
    const url = new URL(req.url);
    const targetCompanyId = req.headers.get("x-company-id") || url.searchParams.get("companyId") || undefined;
    const requestedScopeMode = (req.headers.get("x-scope-mode") || url.searchParams.get("scopeMode")) as "single" | "group" || "single";

    const companyContext = await resolveAuthCompanyContext(session.user, targetCompanyId, requestedScopeMode);

    const items = await AccountModel.find({
      isActive: true,
      companyId: { $in: companyContext.allowedCompanyIds },
    })
      .sort({ isPrimary: -1, name: 1 })
      .lean();
    
    // Convert Mongoose Decimal128 to numbers
    const sanitizedItems = JSON.parse(JSON.stringify(items), (key, value) => {
      if (value && typeof value === 'object' && value.$numberDecimal) {
        return parseFloat(value.$numberDecimal);
      }
      return value;
    });

    return NextResponse.json({ items: sanitizedItems });
  } catch (error) {
    return authErrorResponse(error, "Failed to load accounts");
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireRole(["admin"]);
    await connectDB();
    const body = await req.json();
    
    const targetCompanyId = body.companyId || req.headers.get("x-company-id") || undefined;
    const companyContext = await resolveAuthCompanyContext(session.user, targetCompanyId, "single");

    const effectiveCompanyId = body.companyId || companyContext.activeCompanyId;
    if (!companyContext.allowedCompanyIds.includes(String(effectiveCompanyId))) {
      return NextResponse.json(
        { message: "Target company is outside your authorized operating scope." },
        { status: 403 }
      );
    }
    
    body.companyId = effectiveCompanyId;
    body.createdBy = session.user.id;
    
    if (body.isPrimary) {
      await AccountModel.updateMany(
        { companyId: effectiveCompanyId, isPrimary: true },
        { isPrimary: false }
      );
    }
    
    const item = await AccountModel.create(body);
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error, "Failed to create account");
  }
}
