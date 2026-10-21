import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { authErrorResponse } from "@/lib/api/route-auth";
import { connectDB } from "@/lib/db/connect";
import { CompanyModel, UserModel } from "@/lib/db/models";
import { logActivity } from "@/lib/services/activity/log-activity.service";
import { sanitizeText } from "@/lib/security/sanitize";
import { getUserAccessInfo } from "@/lib/auth/user-company-access";

export async function GET() {
  try {
    const session = await requireRole(["admin", "employee"]);
    await connectDB();

    const userAccess = await getUserAccessInfo(session.user.id, session.user.role);

    const query: Record<string, any> = { deletedAt: null };
    if (!userAccess.isSuperAdmin) {
      query._id = { $in: userAccess.assignedCompanyIds };
    }

    const companies = await CompanyModel.find(query)
      .populate("parentCompanyId", "name code kind")
      .sort({ updatedAt: -1 })
      .lean();

    return NextResponse.json({ items: companies });
  } catch (error) {
    return authErrorResponse(error, "Failed to fetch companies");
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireRole(["admin"]);
    await connectDB();

    const userAccess = await getUserAccessInfo(session.user.id, session.user.role);
    const body = await req.json();

    const name = sanitizeText(String(body.name || "").trim());
    let code = String(body.code || "").trim().toUpperCase();
    const kind = String(body.kind || "operating").toLowerCase();
    const parentCompanyId = body.parentCompanyId ? String(body.parentCompanyId) : null;

    if (!name) {
      return NextResponse.json({ error: "Company name is required" }, { status: 400 });
    }

    if (!userAccess.isSuperAdmin) {
      if (body.isPrimary === true) {
        return NextResponse.json({ error: "Only Super Admin can designate a primary company." }, { status: 403 });
      }
      if (!parentCompanyId || !userAccess.assignedCompanyIds.includes(parentCompanyId)) {
        return NextResponse.json(
          { error: "Standard Admins can only create branch or division entities under their assigned parent company." },
          { status: 403 }
        );
      }
      if (kind === "holding") {
        return NextResponse.json({ error: "Only Super Admin can create holding company entities." }, { status: 403 });
      }
    }

    // Auto-generate code if missing
    if (!code) {
      code = name
        .replace(/[^A-Za-z0-9]/g, "")
        .substring(0, 4)
        .toUpperCase();
      if (!code) code = "COMP";
    }

    // Check duplicate code
    const existingCode = await CompanyModel.findOne({ code, deletedAt: null }).lean();
    if (existingCode) {
      code = `${code}${Math.floor(10 + Math.random() * 90)}`;
    }

    const company = await CompanyModel.create({
      name,
      code,
      kind: ["holding", "operating", "branch", "division"].includes(kind) ? kind : "operating",
      parentCompanyId: parentCompanyId || null,
      address: sanitizeText(String(body.address || "")),
      contactName: sanitizeText(String(body.contactName || "")),
      email: String(body.email || "").toLowerCase(),
      phone: String(body.phone || ""),
      website: String(body.website || ""),
      taxId: String(body.taxId || ""),
      baseCurrency: String(body.baseCurrency || "AED").toUpperCase(),
      supportedCurrencies: Array.isArray(body.supportedCurrencies)
        ? body.supportedCurrencies
        : [body.baseCurrency || "AED"],
      branding: {
        logoUrl: String(body.branding?.logoUrl || body.logoText || ""),
        logoText: String(body.branding?.logoText || body.logoText || ""),
        signatureUrl: String(body.branding?.signatureUrl || body.signatureText || ""),
        signatureText: String(body.branding?.signatureText || body.signatureText || ""),
        companySealUrl: String(body.branding?.companySealUrl || ""),
        invoicePrefix: String(body.branding?.invoicePrefix || `${code}-INV`),
        quotationPrefix: String(body.branding?.quotationPrefix || `${code}-QT`),
        poPrefix: String(body.branding?.poPrefix || `${code}-PO`),
        invoiceFooter: sanitizeText(String(body.branding?.invoiceFooter || "")),
        bankDetailsText: sanitizeText(String(body.branding?.bankDetailsText || "")),
      },
      logoText: String(body.logoText || body.branding?.logoText || ""),
      signatureText: String(body.signatureText || body.branding?.signatureText || ""),
      isActive: true,
      isPrimary: body.isPrimary === true,
    });

    // If marked primary, unset other primary flags
    if (body.isPrimary === true) {
      await CompanyModel.updateMany({ _id: { $ne: company._id } }, { $set: { isPrimary: false } });
    }

    if (!userAccess.isSuperAdmin) {
      await UserModel.findByIdAndUpdate(session.user.id, {
        $addToSet: { companyIds: company._id },
      });
    }

    await logActivity({
      userId: session.user.id,
      action: "created_company",
      entityType: "company",
      entityId: String(company._id),
      message: `Created company ${name} (${code})`,
    });

    return NextResponse.json({ item: company });
  } catch (error) {
    return authErrorResponse(error, "Failed to create company");
  }
}
