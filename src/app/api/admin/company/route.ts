import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { connectDB } from "@/lib/db/connect";
import { CompanyModel } from "@/lib/db/models";
import { authErrorResponse } from "@/lib/api/route-auth";
import { logActivity } from "@/lib/services/activity/log-activity.service";

export async function GET() {
  try {
    await requireRole(["admin", "employee"]);
    await connectDB();
    const item = await CompanyModel.findOne({ isPrimary: true })
      .sort({ updatedAt: -1 })
      .lean();
    return NextResponse.json({ item });
  } catch (error) {
    return authErrorResponse(error, "Failed to load company settings");
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await requireRole(["admin"]);
    await connectDB();
    const body = (await req.json()) as {
      name?: string;
      address?: string;
      contactName?: string;
      email?: string;
      website?: string;
      logoText?: string;
      signatureText?: string;
    };

    const current = await CompanyModel.findOne({ isPrimary: true }).lean();
    let updated;
    if (!current) {
      updated = await CompanyModel.create({
        name: String(body.name ?? "My Company").trim(),
        address: String(body.address ?? ""),
        contactName: String(body.contactName ?? ""),
        email: String(body.email ?? "").toLowerCase(),
        website: String(body.website ?? ""),
        logoText: String(body.logoText ?? ""),
        signatureText: String(body.signatureText ?? ""),
        isPrimary: true,
      });
    } else {
      updated = await CompanyModel.findByIdAndUpdate(
        current._id,
        {
          $set: {
            name: String(body.name ?? current.name).trim(),
            address: String(body.address ?? current.address ?? ""),
            contactName: String(body.contactName ?? current.contactName ?? ""),
            email: String(body.email ?? current.email ?? "").toLowerCase(),
            website: String(body.website ?? current.website ?? ""),
            logoText: String(
              body.logoText ?? current.logoText ?? ""
            ),
            signatureText: String(
              body.signatureText ?? current.signatureText ?? ""
            ),
          },
        },
        { returnDocument: "after" }
      );
    }

    await logActivity({
      userId: session.user.id,
      action: "updated_company_settings",
      entityType: "company_settings",
      entityId: String(updated?._id ?? ""),
      message: "Updated company settings",
    });

    return NextResponse.json({ item: updated });
  } catch (error) {
    return authErrorResponse(error, "Failed to update company settings");
  }
}
