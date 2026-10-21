import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { UserModel, CounterModel } from "@/lib/db/models";
import { requireRole } from "@/lib/auth/require-role";
import { authErrorResponse } from "@/lib/api/route-auth";
import { logActivity } from "@/lib/services/activity/log-activity.service";
import { hashPassword, validatePasswordComplexity } from "@/lib/auth/password";
import { sanitizeText } from "@/lib/security/sanitize";
import { getUserAccessInfo } from "@/lib/auth/user-company-access";
import mongoose, { Types } from "mongoose";

interface RouteCtx {
  params: Promise<{ userId: string }>;
}

/**
 * Concurrency-safe execution of Super Admin demotion/deactivation.
 * Uses a transactional write lock on CounterModel to eliminate TOCTOU race conditions.
 */
async function updateSuperAdminWithAtomicGuard(
  targetUserId: string,
  updates: Record<string, unknown>
): Promise<void> {
  const db = await connectDB();
  const topology = (db.connection as any).client?.topology?.description?.type;
  const supportsTransactions = topology === "ReplicaSetWithPrimary" || topology === "Sharded";

  if (supportsTransactions) {
    const session = await db.startSession();
    try {
      await session.withTransaction(async () => {
        // Exclusive write lock on the super admin mutex counter
        await CounterModel.findOneAndUpdate(
          { key: "SUPER_ADMIN_MUTEX", fiscalYear: "SYSTEM" },
          { $inc: { sequenceValue: 1 } },
          { upsert: true, session, returnDocument: "after" }
        );

        const otherActiveSuperAdmins = await UserModel.countDocuments({
          _id: { $ne: targetUserId },
          role: "super_admin",
          isActive: { $ne: false },
        }).session(session);

        if (otherActiveSuperAdmins === 0) {
          const err = new Error("Cannot demote or deactivate the only active Super Admin. At least one Super Admin must remain active.");
          (err as any).statusCode = 400;
          throw err;
        }

        await UserModel.findByIdAndUpdate(targetUserId, { $set: updates }, { session });
      });
    } finally {
      await session.endSession();
    }
  } else {
    // Standalone fallback
    const otherActiveSuperAdmins = await UserModel.countDocuments({
      _id: { $ne: targetUserId },
      role: "super_admin",
      isActive: { $ne: false },
    });
    if (otherActiveSuperAdmins === 0) {
      const err = new Error("Cannot demote or deactivate the only active Super Admin. At least one Super Admin must remain active.");
      (err as any).statusCode = 400;
      throw err;
    }
    await UserModel.findByIdAndUpdate(targetUserId, { $set: updates });
  }
}

export async function PATCH(req: Request, ctx: RouteCtx) {
  try {
    const session = await requireRole(["admin"]);
    const isSuperAdmin = session.user.role === "super_admin";
    await connectDB();
    const { userId } = await ctx.params;

    if (!Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ message: "Invalid user ID format" }, { status: 400 });
    }

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

    const targetUser = await UserModel.findById(userId)
      .select("_id role email isActive companyIds primaryCompanyId companyMemberships defaultCompanyId")
      .lean();
    if (!targetUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const isSelf = session.user.id === userId;

    // --- PRIORITY 2: STRICT PRIVILEGE ESCALATION GUARDS ---
    if (isSelf) {
      // Standard self-service profile update:
      // Users can ONLY update their personal details: name, phone, signatureUrl, password.
      // Any attempt by a standard admin to escalate role, change isActive, change groupViewAccess,
      // or change company/group assignments on their own account is strictly forbidden.
      if (body.role !== undefined && body.role !== targetUser.role) {
        return NextResponse.json(
          { message: "You cannot change your own system role." },
          { status: 403 }
        );
      }
      if (body.isActive !== undefined && body.isActive !== targetUser.isActive) {
        return NextResponse.json(
          { message: "You cannot change your own account status." },
          { status: 400 }
        );
      }
      if (body.groupViewAccess !== undefined && !isSuperAdmin) {
        return NextResponse.json(
          { message: "You cannot grant or alter group view access on your own account." },
          { status: 403 }
        );
      }
      if (
        (body.companyIds !== undefined || body.primaryCompanyId !== undefined || body.groupIds !== undefined) &&
        !isSuperAdmin
      ) {
        return NextResponse.json(
          { message: "You cannot modify company or group scopes on your own account." },
          { status: 403 }
        );
      }
    } else {
      // Managing another account:
      // 1. Only a super_admin can modify a super_admin account
      if (targetUser.role === "super_admin" && !isSuperAdmin) {
        return NextResponse.json(
          { message: "Only a Super Admin can modify a Super Admin account." },
          { status: 403 }
        );
      }

      // 2. Only a super_admin can modify other admin accounts
      if (targetUser.role === "admin" && !isSuperAdmin) {
        return NextResponse.json(
          { message: "Only a Super Admin can modify other Admin accounts." },
          { status: 403 }
        );
      }

      // 3. Only a super_admin can assign or change roles
      if (body.role !== undefined && body.role !== targetUser.role && !isSuperAdmin) {
        return NextResponse.json(
          { message: "Only a Super Admin can grant or change user roles." },
          { status: 403 }
        );
      }

      // 4. Standard admin scope verification
      if (!isSuperAdmin) {
        const targetCompanies = [
          ...(targetUser.companyIds || []).map(String),
          ...(targetUser.primaryCompanyId ? [String(targetUser.primaryCompanyId)] : []),
          ...((targetUser as any).companyMemberships || []).map((m: any) => String(m.companyId)),
          ...((targetUser as any).defaultCompanyId ? [String((targetUser as any).defaultCompanyId)] : []),
        ];

        const hasSharedCompany =
          targetCompanies.length > 0 &&
          targetCompanies.some((cId) => callerAccess.assignedCompanyIds.includes(cId));

        if (!hasSharedCompany) {
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

        if (body.groupViewAccess !== undefined) {
          return NextResponse.json(
            { message: "Only a Super Admin can grant group view access." },
            { status: 403 }
          );
        }
      }
    }

    const updates: Record<string, unknown> = {};

    if (body.name !== undefined) updates.name = sanitizeText(body.name).trim();
    if (body.phone !== undefined) {
      updates.phone = String(body.phone);
      updates.phoneNumber = String(body.phone);
    }
    if (body.signatureUrl !== undefined) {
      updates.signatureUrl = String(body.signatureUrl);
    }

    // Role updates (Super Admin only)
    if (body.role !== undefined && ["admin", "employee", "super_admin"].includes(body.role)) {
      if (isSuperAdmin) {
        updates.role = body.role;
      }
    }

    // Company assignments (Super Admin or authorized Standard Admin)
    if (Array.isArray(body.companyIds) && (!isSelf || isSuperAdmin)) {
      updates.companyIds = body.companyIds.map((cId) => new Types.ObjectId(cId));
      // Synchronize companyMemberships
      updates.companyMemberships = body.companyIds.map((cId) => ({
        companyId: new Types.ObjectId(cId),
        role: body.role === "admin" ? "company_admin" : "employee",
        permissions: [],
        isDefault: body.primaryCompanyId ? String(cId) === String(body.primaryCompanyId) : false,
        joinedAt: new Date(),
      }));
    }

    if (body.primaryCompanyId !== undefined && (!isSelf || isSuperAdmin)) {
      updates.primaryCompanyId = body.primaryCompanyId ? new Types.ObjectId(body.primaryCompanyId) : null;
      updates.defaultCompanyId = body.primaryCompanyId ? new Types.ObjectId(body.primaryCompanyId) : null;
    }

    if (Array.isArray(body.groupIds) && (!isSelf || isSuperAdmin)) {
      updates.groupIds = body.groupIds.map((gId) => new Types.ObjectId(gId));
    }

    if (typeof body.groupViewAccess === "boolean" && isSuperAdmin) {
      updates.groupViewAccess = body.groupViewAccess;
    }

    if (body.isActive !== undefined && !isSelf) {
      updates.isActive = Boolean(body.isActive);
    }

    let passwordReset = false;
    if (body.password !== undefined && String(body.password).trim() !== "") {
      const pass = String(body.password).trim();
      const check = validatePasswordComplexity(pass, targetUser.email);
      if (!check.ok || !check.valid) {
        return NextResponse.json({ message: check.message || check.error }, { status: 400 });
      }
      updates.password = await hashPassword(pass);
      updates.resetPasswordToken = null;
      updates.resetPasswordExpires = null;
      passwordReset = true;
    }

    // --- PRIORITY 4: LAST ACTIVE SUPER ADMIN CONCURRENCY GUARD ---
    const isDemotingOrDeactivatingSuperAdmin =
      targetUser.role === "super_admin" &&
      ((updates.role && updates.role !== "super_admin") || updates.isActive === false);

    if (isDemotingOrDeactivatingSuperAdmin) {
      try {
        await updateSuperAdminWithAtomicGuard(userId, updates);
      } catch (err: any) {
        return NextResponse.json(
          { message: err.message || "Cannot demote or deactivate the only active Super Admin." },
          { status: err.statusCode || 400 }
        );
      }
    } else {
      await UserModel.findByIdAndUpdate(userId, { $set: updates });
    }

    const updated = await UserModel.findById(userId)
      .select("_id name email role isActive phone companyIds groupIds groupViewAccess primaryCompanyId signatureUrl updatedAt")
      .lean();

    await logActivity({
      userId: session.user.id,
      action: "updated_user",
      entityType: "user",
      entityId: String(userId),
      message: passwordReset ? `Reset password for user ${targetUser.email}` : `Updated user ${targetUser.email}`,
    });

    return NextResponse.json({ item: updated });
  } catch (error) {
    return authErrorResponse(error, "Failed to update user");
  }
}

export async function DELETE(req: Request, ctx: RouteCtx) {
  try {
    const session = await requireRole(["admin"]);
    const isSuperAdmin = session.user.role === "super_admin";
    await connectDB();
    const { userId } = await ctx.params;

    if (!Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ message: "Invalid user ID format" }, { status: 400 });
    }

    const callerAccess = await getUserAccessInfo(session.user.id, session.user.role);

    const url = new URL(req.url);
    const mode = url.searchParams.get("mode") || "deactivate";

    // --- PRIORITY 3: DISABLE UNSAFE PERMANENT DELETION ---
    if (mode === "permanent") {
      return NextResponse.json(
        {
          message:
            "Permanent deletion of user accounts is disabled in FinCore ERP to maintain immutable financial records and audit integrity. Use safe deactivation instead.",
        },
        { status: 400 }
      );
    }

    // --- SAFE DEACTIVATION ---
    if (session.user.id === userId) {
      return NextResponse.json(
        { message: "You cannot deactivate or delete your own account." },
        { status: 400 }
      );
    }

    const targetUser = await UserModel.findById(userId)
      .select("_id role email companyIds primaryCompanyId companyMemberships defaultCompanyId isActive")
      .lean();
    if (!targetUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Role Hierarchy Guards:
    if (targetUser.role === "super_admin") {
      if (!isSuperAdmin) {
        return NextResponse.json(
          { message: "Only a Super Admin can modify or deactivate a Super Admin account." },
          { status: 403 }
        );
      }

      // Concurrency-safe deactivation of Super Admin
      try {
        await updateSuperAdminWithAtomicGuard(userId, { isActive: false });
      } catch (err: any) {
        return NextResponse.json(
          { message: err.message || "Cannot deactivate the only active Super Admin account." },
          { status: err.statusCode || 400 }
        );
      }
    } else if (targetUser.role === "admin") {
      if (!isSuperAdmin) {
        return NextResponse.json(
          { message: "Only a Super Admin can deactivate Admin accounts." },
          { status: 403 }
        );
      }
      await UserModel.findByIdAndUpdate(userId, { $set: { isActive: false } });
    } else {
      // Standard Admin can only deactivate users within their assigned companies
      if (!isSuperAdmin) {
        const targetCompanies = [
          ...(targetUser.companyIds || []).map(String),
          ...(targetUser.primaryCompanyId ? [String(targetUser.primaryCompanyId)] : []),
          ...((targetUser as any).companyMemberships || []).map((m: any) => String(m.companyId)),
          ...((targetUser as any).defaultCompanyId ? [String((targetUser as any).defaultCompanyId)] : []),
        ];

        const hasSharedCompany =
          targetCompanies.length > 0 &&
          targetCompanies.some((cId) => callerAccess.assignedCompanyIds.includes(cId));

        if (!hasSharedCompany) {
          return NextResponse.json(
            { message: "You can only manage users within your authorized company scope." },
            { status: 403 }
          );
        }
      }
      await UserModel.findByIdAndUpdate(userId, { $set: { isActive: false } });
    }

    await logActivity({
      userId: session.user.id,
      action: "updated_user",
      entityType: "user",
      entityId: String(targetUser._id),
      message: `Deactivated user ${targetUser.email} (Safe Deactivation)`,
    });

    return NextResponse.json({ ok: true, action: "deactivated" });
  } catch (error) {
    return authErrorResponse(error, "Failed to deactivate user");
  }
}
