import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { connectDB } from "@/lib/db/connect";
import { CompanyModel } from "@/lib/db/models";
import { authErrorResponse } from "@/lib/api/route-auth";
import { logActivity } from "@/lib/services/activity/log-activity.service";

interface RouteCtx {
  params: Promise<{ companyId: string }>;
}

export async function PATCH(req: Request, ctx: RouteCtx) {
  try {
    const session = await requireRole(["admin"]);
    await connectDB();
    const { companyId } = await ctx.params;
    const body = (await req.json()) as {
      name?: string;
      contactName?: string;
      email?: string;
      website?: string;
      address?: string;
      logoText?: string;
      signatureText?: string;
      isPrimary?: boolean;
      defaultTax?: { taxRate?: number; taxEnabled?: boolean };
    };

    if (body.isPrimary === true) {
      await CompanyModel.updateMany({ isPrimary: true }, { $set: { isPrimary: false } });
    }

    const updated = await CompanyModel.findByIdAndUpdate(
      companyId,
      {
        $set: {
          name: body.name,
          contactName: body.contactName,
          email: body.email?.toLowerCase(),
          website: body.website,
          address: body.address,
          logoText: body.logoText,
          signatureText: body.signatureText,
          isPrimary: body.isPrimary,
          ...(body.defaultTax
            ? {
                defaultTax: {
                  taxRate: Number(body.defaultTax.taxRate ?? 0),
                  taxEnabled: Boolean(body.defaultTax.taxEnabled),
                },
              }
            : {}),
        },
      },
      { new: true }
    ).lean();

    if (!updated) {
      return NextResponse.json({ message: "Company not found" }, { status: 404 });
    }

    await logActivity({
      userId: session.user.id,
      action: "updated_company",
      entityType: "company",
      entityId: String(updated._id),
      message: `Updated company ${updated.name}`,
    });

    return NextResponse.json({ item: updated });
  } catch (error) {
    return authErrorResponse(error, "Failed to update company");
  }
}

export async function DELETE(_req: Request, ctx: RouteCtx) {
  try {
    const session = await requireRole(["admin"]);
    await connectDB();
    const { companyId } = await ctx.params;
    const existing = await CompanyModel.findById(companyId).lean();
    if (!existing) {
      return NextResponse.json({ message: "Company not found" }, { status: 404 });
    }
    if (existing.isPrimary) {
      return NextResponse.json(
        { message: "Primary company cannot be deleted. Set another as primary first." },
        { status: 400 }
      );
    }
    await CompanyModel.findByIdAndDelete(companyId);
    await logActivity({
      userId: session.user.id,
      action: "deleted_company",
      entityType: "company",
      entityId: String(existing._id),
      message: `Deleted company ${existing.name}`,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error, "Failed to delete company");
  }
}
