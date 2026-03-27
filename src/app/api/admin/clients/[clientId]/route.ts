import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { connectDB } from "@/lib/db/connect";
import { ClientModel, ProjectModel } from "@/lib/db/models";
import { authErrorResponse } from "@/lib/api/route-auth";
import { logActivity } from "@/lib/services/activity/log-activity.service";

interface RouteCtx {
  params: Promise<{ clientId: string }>;
}

export async function PATCH(req: Request, ctx: RouteCtx) {
  try {
    const session = await requireRole(["admin"]);
    await connectDB();
    const { clientId } = await ctx.params;
    const body = (await req.json()) as {
      name?: string;
      company?: string;
      website?: string;
      address?: string;
      email?: string;
      phone?: string;
      clientLogoText?: string;
      clientSignatureText?: string;
    };

    const updated = await ClientModel.findByIdAndUpdate(
      clientId,
      {
        $set: {
          name: body.name !== undefined ? String(body.name).trim() : undefined,
          company: body.company !== undefined ? String(body.company).trim() : undefined,
          website: body.website !== undefined ? String(body.website).trim() : undefined,
          address: body.address !== undefined ? String(body.address) : undefined,
          email:
            body.email !== undefined
              ? String(body.email).trim().toLowerCase()
              : undefined,
          phone: body.phone !== undefined ? String(body.phone) : undefined,
          clientLogoUrl:
            body.clientLogoText !== undefined ? String(body.clientLogoText) : undefined,
          clientLogoText:
            body.clientLogoText !== undefined ? String(body.clientLogoText) : undefined,
          clientSignatureText:
            body.clientSignatureText !== undefined
              ? String(body.clientSignatureText)
              : undefined,
        },
      },
      { new: true }
    ).lean();

    if (!updated) {
      return NextResponse.json({ message: "Client not found" }, { status: 404 });
    }

    await logActivity({
      userId: session.user.id,
      action: "updated_client",
      entityType: "client",
      entityId: String(updated._id),
      message: `Updated client ${updated.name}`,
    });

    return NextResponse.json({ item: updated });
  } catch (error) {
    return authErrorResponse(error, "Failed to update client");
  }
}

export async function DELETE(_req: Request, ctx: RouteCtx) {
  try {
    const session = await requireRole(["admin"]);
    await connectDB();
    const { clientId } = await ctx.params;
    const linkedProjectCount = await ProjectModel.countDocuments({ clientId });
    if (linkedProjectCount > 0) {
      return NextResponse.json(
        {
          message:
            "Client cannot be deleted because it has linked projects. Remove projects first.",
        },
        { status: 400 }
      );
    }
    const deleted = await ClientModel.findByIdAndDelete(clientId).lean();
    if (!deleted) {
      return NextResponse.json({ message: "Client not found" }, { status: 404 });
    }

    await logActivity({
      userId: session.user.id,
      action: "deleted_client",
      entityType: "client",
      entityId: String(deleted._id),
      message: `Deleted client ${deleted.name}`,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error, "Failed to delete client");
  }
}
