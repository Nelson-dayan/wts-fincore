import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { UserModel } from "@/lib/db/models";
import { requireRole } from "@/lib/auth/require-role";
import { authErrorResponse } from "@/lib/api/route-auth";
import { logActivity } from "@/lib/services/activity/log-activity.service";

interface RouteCtx {
  params: Promise<{ userId: string }>;
}

export async function PATCH(req: Request, ctx: RouteCtx) {
  try {
    const session = await requireRole(["admin"]);
    await connectDB();
    const { userId } = await ctx.params;
    const body = (await req.json()) as {
      name?: string;
      role?: "admin" | "employee";
      phone?: string;
      isActive?: boolean;
      signatureUrl?: string;
    };

    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = String(body.name).trim();
    if (body.role !== undefined) updates.role = body.role;
    if (body.phone !== undefined) {
      updates.phone = String(body.phone);
      updates.phoneNumber = String(body.phone);
    }
    if (body.isActive !== undefined) updates.isActive = Boolean(body.isActive);
    if (body.signatureUrl !== undefined) {
      updates.signatureUrl = String(body.signatureUrl);
    }

    const updated = await UserModel.findByIdAndUpdate(userId, { $set: updates }, { new: true })
      .select("_id name email role isActive phone signatureUrl updatedAt")
      .lean();
    if (!updated) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    await logActivity({
      userId: session.user.id,
      action: "updated_user",
      entityType: "user",
      entityId: String(updated._id),
      message: `Updated user ${updated.email}`,
    });

    return NextResponse.json({ item: updated });
  } catch (error) {
    return authErrorResponse(error, "Failed to update user");
  }
}

export async function DELETE(_req: Request, ctx: RouteCtx) {
  try {
    const session = await requireRole(["admin"]);
    await connectDB();
    const { userId } = await ctx.params;

    if (session.user.id === userId) {
      return NextResponse.json(
        { message: "You cannot delete your own account" },
        { status: 400 }
      );
    }

    const user = await UserModel.findByIdAndDelete(userId).select("_id email").lean();
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    await logActivity({
      userId: session.user.id,
      action: "deleted_user",
      entityType: "user",
      entityId: String(user._id),
      message: `Deleted user ${user.email}`,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error, "Failed to delete user");
  }
}
