import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { UserModel } from "@/lib/db/models";
import { requireRole } from "@/lib/auth/require-role";
import { authErrorResponse } from "@/lib/api/route-auth";
import { logActivity } from "@/lib/services/activity/log-activity.service";
import { hashPassword } from "@/lib/auth/password";

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
      role?: "admin" | "employee" | "super_admin";
      phone?: string;
      isActive?: boolean;
      signatureUrl?: string;
      password?: string;
      companyIds?: string[];
      groupIds?: string[];
      groupViewAccess?: boolean;
      primaryCompanyId?: string;
    };

    const targetUser = await UserModel.findById(userId).select("_id role email isActive").lean();
    if (!targetUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Role Escalation & Hierarchy Guards:
    // 1. Only a super_admin can modify a super_admin account.
    if (targetUser.role === "super_admin" && session.user.role !== "super_admin") {
      return NextResponse.json(
        { message: "Only a Super Admin can modify a Super Admin account." },
        { status: 403 }
      );
    }

    // 2. Only a super_admin can grant the super_admin role.
    if (body.role === "super_admin" && session.user.role !== "super_admin") {
      return NextResponse.json(
        { message: "Only a Super Admin can grant Super Admin privileges." },
        { status: 403 }
      );
    }

    // 3. Ensure at least one active super_admin remains if demoting or deactivating
    if (
      targetUser.role === "super_admin" &&
      ((body.role && body.role !== "super_admin") || body.isActive === false)
    ) {
      const otherActiveSuperAdmins = await UserModel.countDocuments({
        _id: { $ne: targetUser._id },
        role: "super_admin",
        isActive: { $ne: false },
      });
      if (otherActiveSuperAdmins === 0) {
        return NextResponse.json(
          { message: "Cannot demote or deactivate the only active Super Admin." },
          { status: 400 }
        );
      }
    }

    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = String(body.name).trim();
    if (body.role !== undefined && ["admin", "employee", "super_admin"].includes(body.role)) {
      updates.role = body.role;
    }
    if (Array.isArray(body.companyIds)) {
      updates.companyIds = body.companyIds;
    }
    if (Array.isArray(body.groupIds)) {
      updates.groupIds = body.groupIds;
    }
    if (typeof body.groupViewAccess === "boolean") {
      updates.groupViewAccess = body.groupViewAccess;
    }
    if (body.primaryCompanyId !== undefined) {
      updates.primaryCompanyId = body.primaryCompanyId || null;
    }
    if (body.phone !== undefined) {
      updates.phone = String(body.phone);
      updates.phoneNumber = String(body.phone);
    }
    if (body.isActive !== undefined) updates.isActive = Boolean(body.isActive);
    if (body.signatureUrl !== undefined) {
      updates.signatureUrl = String(body.signatureUrl);
    }
    let passwordReset = false;
    if (body.password !== undefined && String(body.password).trim() !== "") {
      const pass = String(body.password).trim();
      if (pass.length < 6) {
        return NextResponse.json({ message: "Password must be at least 6 characters long" }, { status: 400 });
      }
      updates.password = await hashPassword(pass);
      updates.resetPasswordToken = null;
      updates.resetPasswordExpires = null;
      passwordReset = true;
    }

    const updated = await UserModel.findByIdAndUpdate(userId, { $set: updates }, { returnDocument: "after" })
      .select("_id name email role isActive phone companyIds groupIds groupViewAccess primaryCompanyId signatureUrl updatedAt")
      .lean();
    if (!updated) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    await logActivity({
      userId: session.user.id,
      action: "updated_user",
      entityType: "user",
      entityId: String(updated._id),
      message: passwordReset ? `Reset password for user ${updated.email}` : `Updated user ${updated.email}`,
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

    const targetUser = await UserModel.findById(userId).select("_id role email").lean();
    if (!targetUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Role Hierarchy Guards for Account Deletion:
    if (targetUser.role === "super_admin") {
      if (session.user.role !== "super_admin") {
        return NextResponse.json(
          { message: "Only a Super Admin can delete a Super Admin account." },
          { status: 403 }
        );
      }

      const otherSuperAdmins = await UserModel.countDocuments({
        _id: { $ne: targetUser._id },
        role: "super_admin",
      });
      if (otherSuperAdmins === 0) {
        return NextResponse.json(
          { message: "Cannot delete the only Super Admin account." },
          { status: 400 }
        );
      }
    }

    await UserModel.findByIdAndDelete(userId);

    await logActivity({
      userId: session.user.id,
      action: "deleted_user",
      entityType: "user",
      entityId: String(targetUser._id),
      message: `Deleted user ${targetUser.email}`,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error, "Failed to delete user");
  }
}
