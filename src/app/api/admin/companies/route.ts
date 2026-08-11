import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { authErrorResponse } from "@/lib/api/route-auth";
import { connectDB } from "@/lib/db/connect";
import { CompanyModel } from "@/lib/db/models";
import { logActivity } from "@/lib/services/activity/log-activity.service";

export async function GET() {
  try {
    await requireRole(["admin", "employee"]);
    await connectDB();

    const companies = await CompanyModel.find({ deletedAt: null })
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

    const body = await req.json();

    const name = String(body.name || "").trim();
    let code = String(body.code || "").trim().toUpperCase();
    const kind = String(body.kind || "operating").toLowerCase();
    const parentCompanyId = body.parentCompanyId ? String(body.parentCompanyId) : null;

    if (!name) {
      return NextResponse.json({ error: "Company name is required" }, { status: 400 });
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
      address: String(body.address || ""),
      contactName: String(body.contactName || ""),
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
        invoiceFooter: String(body.branding?.invoiceFooter || ""),
        bankDetailsText: String(body.branding?.bankDetailsText || ""),
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
