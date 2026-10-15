import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { UserModel } from "@/lib/db/models";
import { requireRole } from "@/lib/auth/require-role";
import { authErrorResponse } from "@/lib/api/route-auth";
import { logActivity } from "@/lib/services/activity/log-activity.service";
import { hashPassword } from "@/lib/auth/password";
import { getUserAccessInfo } from "@/lib/auth/user-company-access";

interface RouteCtx {
  params: Promise<{ userId: string }>;
}

export async function PATCH(req: Request, ctx: RouteCtx) {
  try {
    const session = await requireRole(["admin"]);
    const isSuperAdmin = session.user.role === "super_admin";
    await connectDB();
    const { userId } = await ctx.params;
    const callerAccess = await getUserAccessInfo(session.user.id, session.user.role);

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

    const targetUser = await UserModel.findById(userId).select("_id role email isActive companyIds primaryCompanyId").lean();
    if (!targetUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Role Escalation & Hierarchy Guards:
    // 1. Only a super_admin can modify a super_admin account.
    if (targetUser.role === "super_admin" && !isSuperAdmin) {
      return NextResponse.json(
        { message: "Only a Super Admin can modify a Super Admin account." },
        { status: 403 }
      );
    }

    // 2. Only a super_admin can modify other admin accounts.
    if (targetUser.role === "admin" && !isSuperAdmin && session.user.id !== userId) {
      return NextResponse.json(
        { message: "Only a Super Admin can modify other Admin accounts." },
        { status: 403 }
      );
    }

    // 3. Only a super_admin can grant the super_admin role.
    if (body.role === "super_admin" && !isSuperAdmin) {
      return NextResponse.json(
        { message: "Only a Super Admin can grant Super Admin privileges." },
        { status: 403 }
      );
    }

    // 4. Only a super_admin can grant the admin role.
    if (body.role === "admin" && !isSuperAdmin) {
      return NextResponse.json(
        { message: "Only a Super Admin can grant Admin privileges." },
        { status: 403 }
      );
    }

    // 5. Standard admin scope verification
    if (!isSuperAdmin && session.user.id !== userId) {
      const targetCompanies = [
        ...(targetUser.companyIds || []).map(String),
        ...(targetUser.primaryCompanyId ? [String(targetUser.primaryCompanyId)] : []),
      ];
      const hasSharedCompany = targetCompanies.some((cId) => callerAccess.assignedCompanyIds.includes(cId));
      if (targetCompanies.length > 0 && !hasSharedCompany) {
        return NextResponse.json(
          { message: "You can only manage users within your authorized company scope." },
          { status: 403 }
        );
      }

      if (Array.isArray(body.companyIds)) {
        const unauthorizedCompany = body.companyIds.find(
          (cId) => !callerAccess.assignedCompanyIds.includes(cId)
        );
        if (unauthorizedCompany) {
          return NextResponse.json(
            { message: "You cannot assign companies outside your authorized scope." },
            { status: 403 }
          );
        }
      }

      if (body.primaryCompanyId && !callerAccess.assignedCompanyIds.includes(body.primaryCompanyId)) {
        return NextResponse.json(
          { message: "Primary company must be one of your authorized companies." },
          { status: 403 }
        );
      }

      if (body.groupViewAccess) {
        return NextResponse.json(
          { message: "Only a Super Admin can grant group view access." },
          { status: 403 }
        );
      }
    }

    // 6. Ensure at least one active super_admin remains if demoting or deactivating
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
    const isSuperAdmin = session.user.role === "super_admin";
    await connectDB();
    const { userId } = await ctx.params;
    const callerAccess = await getUserAccessInfo(session.user.id, session.user.role);

    if (session.user.id === userId) {
      return NextResponse.json(
        { message: "You cannot delete your own account" },
        { status: 400 }
      );
    }

    const targetUser = await UserModel.findById(userId).select("_id role email companyIds primaryCompanyId").lean();
    if (!targetUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Role Hierarchy Guards for Account Deletion:
    if (targetUser.role === "super_admin") {
      if (!isSuperAdmin) {
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

    if (targetUser.role === "admin" && !isSuperAdmin) {
      return NextResponse.json(
        { message: "Only a Super Admin can delete Admin accounts." },
        { status: 403 }
      );
    }

    // Standard Admin can only delete users within their assigned companies
    if (!isSuperAdmin) {
      const targetCompanies = [
        ...(targetUser.companyIds || []).map(String),
        ...(targetUser.primaryCompanyId ? [String(targetUser.primaryCompanyId)] : []),
      ];
      const hasSharedCompany = targetCompanies.some((cId) => callerAccess.assignedCompanyIds.includes(cId));
      if (targetCompanies.length > 0 && !hasSharedCompany) {
        return NextResponse.json(
          { message: "You can only delete users within your authorized company scope." },
          { status: 403 }
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
