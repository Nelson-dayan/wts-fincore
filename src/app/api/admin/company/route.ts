import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { connectDB } from "@/lib/db/connect";
import { CompanyModel, QuotationModel } from "@/lib/db/models";
import { authErrorResponse } from "@/lib/api/route-auth";
import { logActivity } from "@/lib/services/activity/log-activity.service";
import { isImageSrc } from "@/lib/utils/is-image-src";
import { CompanyHierarchyService } from "@/lib/services/business/company-hierarchy.service";

export async function GET(req: Request) {
  try {
    await requireRole(["admin", "employee"]);
    await connectDB();

    const url = new URL(req.url);
    const targetCompanyId = req.headers.get("x-company-id") || url.searchParams.get("companyId");
    const scopeMode = (req.headers.get("x-scope-mode") || url.searchParams.get("scopeMode")) as "single" | "group" || "single";

    const context = await CompanyHierarchyService.resolveCompanyContext(targetCompanyId, scopeMode);
    
    let resolvedCompanyId = context.companyId;
    if (scopeMode === "group") {
      const primaryCompany = await CompanyModel.findOne({ isPrimary: true, deletedAt: null }).lean();
      if (primaryCompany) {
        resolvedCompanyId = primaryCompany._id.toString();
      }
    }

    const item = await CompanyModel.findById(resolvedCompanyId).lean();
    const quotationCount = resolvedCompanyId
      ? await QuotationModel.countDocuments({ companyId: resolvedCompanyId, deletedAt: null })
      : 0;
    const nextQuotationSeq = quotationCount + 1;

    return NextResponse.json({ item, context, quotationCount, nextQuotationSeq });
  } catch (error) {
    return authErrorResponse(error, "Failed to load company settings");
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await requireRole(["admin"]);
    await connectDB();
    const body = await req.json();
    const url = new URL(req.url);

    const targetCompanyId = body._id || body.companyId || req.headers.get("x-company-id") || url.searchParams.get("companyId");
    const context = await CompanyHierarchyService.resolveCompanyContext(targetCompanyId, "single");
    const companyId = context.companyId;

    const current = await CompanyModel.findById(companyId).lean();

    if (!current) {
      return NextResponse.json({ message: "Company entity not found" }, { status: 404 });
    }

    const updates: Record<string, any> = {};

    if (body.name !== undefined) updates.name = String(body.name).trim();
    if (body.code !== undefined) updates.code = String(body.code).trim().toUpperCase();
    if (body.kind !== undefined) updates.kind = body.kind;
    if (body.address !== undefined) updates.address = String(body.address);
    if (body.contactName !== undefined) updates.contactName = String(body.contactName);
    if (body.email !== undefined) updates.email = String(body.email).toLowerCase();
    if (body.phone !== undefined) updates.phone = String(body.phone);
    if (body.website !== undefined) updates.website = String(body.website);
    if (body.taxId !== undefined) updates.taxId = String(body.taxId);
    if (body.baseCurrency !== undefined) updates.baseCurrency = String(body.baseCurrency);
    if (body.isPrimary !== undefined) updates.isPrimary = Boolean(body.isPrimary);

    const currentBranding = current?.branding || {};
    const bodyBranding = body.branding || {};

    // Resolve Logo Image
    const rawLogoCandidates = [
      bodyBranding.logoUrl,
      bodyBranding.logoText,
      body.logoUrl,
      body.logoText,
    ];
    const logoImg = rawLogoCandidates.find((c) => typeof c === "string" && isImageSrc(c));

    // Resolve Signature Image
    const rawSigCandidates = [
      bodyBranding.signatureUrl,
      bodyBranding.signatureText,
      body.signatureUrl,
      body.signatureText,
    ];
    const sigImg = rawSigCandidates.find((c) => typeof c === "string" && isImageSrc(c));

    const finalLogo = logoImg ?? bodyBranding.logoUrl ?? body.logoUrl ?? (isImageSrc(current?.logoText) ? current?.logoText : currentBranding.logoUrl) ?? "";
    const finalSig = sigImg ?? bodyBranding.signatureUrl ?? body.signatureUrl ?? (isImageSrc(current?.signatureText) ? current?.signatureText : currentBranding.signatureUrl) ?? "";
    const finalSeal = bodyBranding.companySealUrl ?? body.companySealUrl ?? currentBranding.companySealUrl ?? "";

    updates.logoText = finalLogo;
    updates.signatureText = finalSig;

    updates.branding = {
      ...currentBranding,
      ...bodyBranding,
      logoUrl: finalLogo,
      logoText: finalLogo,
      signatureUrl: finalSig,
      signatureText: finalSig,
      companySealUrl: finalSeal,
      invoicePrefix: bodyBranding.invoicePrefix ?? body.invoicePrefix ?? currentBranding.invoicePrefix ?? `${updates.code || current?.code || "INV"}-INV`,
      quotationPrefix: bodyBranding.quotationPrefix ?? body.quotationPrefix ?? currentBranding.quotationPrefix ?? `${updates.code || current?.code || "QT"}-QT`,
      poPrefix: bodyBranding.poPrefix ?? body.poPrefix ?? currentBranding.poPrefix ?? `${updates.code || current?.code || "PO"}-PO`,
      invoiceFooter: bodyBranding.invoiceFooter ?? body.invoiceFooter ?? currentBranding.invoiceFooter ?? "",
      bankDetailsText: bodyBranding.bankDetailsText ?? body.bankDetailsText ?? currentBranding.bankDetailsText ?? "",
    };

    const updated = await CompanyModel.findByIdAndUpdate(
      companyId,
      { $set: updates },
      { new: true, runValidators: true }
    ).lean();

    await logActivity({
      userId: session.user.id,
      action: "updated_company_settings",
      entityType: "company",
      entityId: String(companyId),
      message: `Updated company settings for ${updated?.name || updates.name || "company"}`,
    });

    return NextResponse.json({ item: updated });
  } catch (error) {
    return authErrorResponse(error, "Failed to update company settings");
  }
}
