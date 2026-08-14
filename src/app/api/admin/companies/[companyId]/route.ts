import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { authErrorResponse } from "@/lib/api/route-auth";
import { connectDB } from "@/lib/db/connect";
import { CompanyModel } from "@/lib/db/models";
import { logActivity } from "@/lib/services/activity/log-activity.service";
import { isImageSrc } from "@/lib/utils/is-image-src";

import { authorizeResource } from "@/lib/auth/authorization";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    await connectDB();
    const { companyId } = await params;

    const auth = await authorizeResource({
      permission: "company.view",
      companyId,
    });
    if (!auth.authorized) {
      return authErrorResponse({ message: auth.reason, code: auth.code }, "Access denied");
    }

    const company = await CompanyModel.findOne({ _id: companyId, deletedAt: null })
      .populate("parentCompanyId", "name code kind")
      .lean();

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    return NextResponse.json({ item: company });
  } catch (error) {
    return authErrorResponse(error, "Failed to fetch company");
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    await connectDB();
    const { companyId } = await params;

    const auth = await authorizeResource({
      permission: "company.edit",
      companyId,
    });
    if (!auth.authorized) {
      return authErrorResponse({ message: auth.reason, code: auth.code }, "Access denied");
    }
    const session = auth.context;
    const body = await req.json();

    const current = await CompanyModel.findOne({ _id: companyId, deletedAt: null });
    if (!current) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const updates: Record<string, any> = {};

    if (body.name !== undefined) updates.name = String(body.name).trim();
    if (body.code !== undefined) updates.code = String(body.code).trim().toUpperCase();
    if (body.kind !== undefined) updates.kind = body.kind;
    if (body.parentCompanyId !== undefined) updates.parentCompanyId = body.parentCompanyId || null;
    if (body.address !== undefined) updates.address = String(body.address);
    if (body.contactName !== undefined) updates.contactName = String(body.contactName);
    if (body.email !== undefined) updates.email = String(body.email).toLowerCase();
    if (body.phone !== undefined) updates.phone = String(body.phone);
    if (body.website !== undefined) updates.website = String(body.website);
    if (body.taxId !== undefined) updates.taxId = String(body.taxId);
    if (body.baseCurrency !== undefined) updates.baseCurrency = String(body.baseCurrency);
    if (body.supportedCurrencies !== undefined) updates.supportedCurrencies = body.supportedCurrencies;
    if (body.isActive !== undefined) updates.isActive = Boolean(body.isActive);
    if (body.isPrimary !== undefined) updates.isPrimary = Boolean(body.isPrimary);

    if (body.branding) {
      updates.branding = {
        ...(current.branding || {}),
        ...body.branding,
      };

      // Resolve logo image: prioritize valid image sources
      const rawLogoCandidates = [
        body.branding.logoUrl,
        body.branding.logoText,
        body.logoText,
      ];
      const logoImg = rawLogoCandidates.find((c) => typeof c === "string" && isImageSrc(c));

      if (logoImg) {
        updates.branding.logoUrl = logoImg;
        updates.branding.logoText = logoImg;
        updates.logoText = logoImg;
      } else if (body.branding.logoUrl !== undefined) {
        updates.branding.logoUrl = String(body.branding.logoUrl);
        if (isImageSrc(current.logoText) && !isImageSrc(body.branding.logoUrl)) {
          // Keep base64 image in logoText if body doesn't supply a new image
          updates.branding.logoUrl = current.logoText;
        }
      }

      // Resolve signature image: prioritize valid image sources
      const rawSigCandidates = [
        body.branding.signatureUrl,
        body.branding.signatureText,
        body.signatureText,
      ];
      const sigImg = rawSigCandidates.find((c) => typeof c === "string" && isImageSrc(c));

      if (sigImg) {
        updates.branding.signatureUrl = sigImg;
        updates.branding.signatureText = sigImg;
        updates.signatureText = sigImg;
      } else if (body.branding.signatureUrl !== undefined) {
        updates.branding.signatureUrl = String(body.branding.signatureUrl);
        if (isImageSrc(current.signatureText) && !isImageSrc(body.branding.signatureUrl)) {
          updates.branding.signatureUrl = current.signatureText;
        }
      }
    }
    if (body.logoText !== undefined && isImageSrc(body.logoText)) updates.logoText = String(body.logoText);
    if (body.signatureText !== undefined && isImageSrc(body.signatureText)) updates.signatureText = String(body.signatureText);

    const updated = await CompanyModel.findByIdAndUpdate(
      companyId,
      { $set: updates },
      { new: true }
    ).lean();

    if (body.isPrimary === true) {
      await CompanyModel.updateMany({ _id: { $ne: companyId } }, { $set: { isPrimary: false } });
    }

    await logActivity({
      userId: session.userId,
      action: "updated_company",
      entityType: "company",
      entityId: companyId,
      message: `Updated company details for ${updated?.name || companyId}`,
    });

    return NextResponse.json({ item: updated });
  } catch (error) {
    return authErrorResponse(error, "Failed to update company");
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    await connectDB();
    const { companyId } = await params;

    const auth = await authorizeResource({
      permission: "company.delete",
      companyId,
    });
    if (!auth.authorized) {
      return authErrorResponse({ message: auth.reason, code: auth.code }, "Access denied");
    }
    const session = auth.context;

    const company = await CompanyModel.findById(companyId);
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Perform soft delete
    company.isActive = false;
    company.deletedAt = new Date();
    company.deletedBy = session.userId as any;
    await company.save();

    await logActivity({
      userId: session.userId,
      action: "deleted_company",
      entityType: "company",
      entityId: companyId,
      message: `Soft deleted company ${company.name}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return authErrorResponse(error, "Failed to delete company");
  }
}
