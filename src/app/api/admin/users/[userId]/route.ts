import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { 
  UserModel, 
  TransferModel, 
  PaymentModel, 
  InvoiceModel, 
  PurchaseOrderModel, 
  QuotationModel, 
  ExpenseModel, 
  AccountTransactionModel 
} from "@/lib/db/models";
import { requireRole } from "@/lib/auth/require-role";
import { authErrorResponse } from "@/lib/api/route-auth";
import { logActivity } from "@/lib/services/activity/log-activity.service";
import { hashPassword, validatePasswordComplexity } from "@/lib/auth/password";
import { sanitizeText } from "@/lib/security/sanitize";
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
      const hasSharedCompany = targetCompanies.length > 0 && targetCompanies.some((cId) => callerAccess.assignedCompanyIds.includes(cId));
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
    if (body.name !== undefined) updates.name = sanitizeText(body.name).trim();
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
      const existingUser = await UserModel.findById(userId).select("email").lean();
      if (!existingUser) {
        return NextResponse.json({ message: "User not found" }, { status: 404 });
      }
      const pass = String(body.password).trim();
      const check = validatePasswordComplexity(pass, existingUser.email);
      if (!check.ok || !check.valid) {
        return NextResponse.json({ message: check.message || check.error }, { status: 400 });
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

export async function DELETE(req: Request, ctx: RouteCtx) {
  try {
    const session = await requireRole(["admin"]);
    const isSuperAdmin = session.user.role === "super_admin";
    await connectDB();
    const { userId } = await ctx.params;
    const callerAccess = await getUserAccessInfo(session.user.id, session.user.role);

    const url = new URL(req.url);
    const mode = url.searchParams.get("mode") || "deactivate"; // "deactivate" (soft) | "permanent" (hard)

    if (session.user.id === userId) {
      return NextResponse.json(
        { message: "You cannot deactivate or delete your own account." },
        { status: 400 }
      );
    }

    const targetUser = await UserModel.findById(userId).select("_id role email companyIds primaryCompanyId isActive").lean();
    if (!targetUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Role Hierarchy Guards for Account Deletion / Deactivation:
    if (targetUser.role === "super_admin") {
      if (!isSuperAdmin) {
        return NextResponse.json(
          { message: "Only a Super Admin can modify or delete a Super Admin account." },
          { status: 403 }
        );
      }

      const otherActiveSuperAdmins = await UserModel.countDocuments({
        _id: { $ne: targetUser._id },
        role: "super_admin",
        isActive: { $ne: false },
      });
      if (otherActiveSuperAdmins === 0) {
        return NextResponse.json(
          { message: "Cannot deactivate or delete the only active Super Admin account. At least one Super Admin must remain active." },
          { status: 400 }
        );
      }
    }

    if (targetUser.role === "admin" && !isSuperAdmin) {
      return NextResponse.json(
        { message: "Only a Super Admin can deactivate or delete Admin accounts." },
        { status: 403 }
      );
    }

    // Standard Admin can only manage users within their assigned companies
    if (!isSuperAdmin) {
      const targetCompanies = [
        ...(targetUser.companyIds || []).map(String),
        ...(targetUser.primaryCompanyId ? [String(targetUser.primaryCompanyId)] : []),
      ];
      const hasSharedCompany = targetCompanies.length > 0 && targetCompanies.some((cId) => callerAccess.assignedCompanyIds.includes(cId));
      if (!hasSharedCompany) {
        return NextResponse.json(
          { message: "You can only manage users within your authorized company scope." },
          { status: 403 }
        );
      }
    }

    // Mode: Permanent Deletion (Hard Delete)
    if (mode === "permanent") {
      // Check for historical financial transactions linked to this user
      const [
        hasTransfers,
        hasPayments,
        hasInvoices,
        hasPOs,
        hasQuotations,
        hasExpenses,
        hasAccountTx,
      ] = await Promise.all([
        TransferModel.exists({ $or: [{ createdBy: userId }, { approvedBy: userId }] }),
        PaymentModel.exists({ createdBy: userId }),
        InvoiceModel.exists({ createdBy: userId }),
        PurchaseOrderModel.exists({ createdBy: userId }),
        QuotationModel.exists({ createdBy: userId }),
        ExpenseModel.exists({ createdBy: userId }),
        AccountTransactionModel.exists({ $or: [{ createdBy: userId }, { userId }] }),
      ]);

      const isLinkedToFinancialRecords = Boolean(
        hasTransfers || hasPayments || hasInvoices || hasPOs || hasQuotations || hasExpenses || hasAccountTx
      );

      if (isLinkedToFinancialRecords) {
        return NextResponse.json(
          {
            message: "Cannot permanently delete this user because they are linked to historical financial records (transfers, payments, invoices, or ledger transactions). Deactivate the account instead to maintain financial audit integrity.",
            canDeactivate: true,
            isLinkedToFinancialRecords: true,
          },
          { status: 409 }
        );
      }

      await UserModel.findByIdAndDelete(userId);

      await logActivity({
        userId: session.user.id,
        action: "deleted_user",
        entityType: "user",
        entityId: String(targetUser._id),
        message: `Permanently deleted user ${targetUser.email}`,
      });

      return NextResponse.json({ ok: true, action: "deleted" });
    }

    // Mode: Safe Deactivation (Soft Delete - Default)
    await UserModel.findByIdAndUpdate(userId, {
      isActive: false,
    });

    await logActivity({
      userId: session.user.id,
      action: "updated_user",
      entityType: "user",
      entityId: String(targetUser._id),
      message: `Deactivated user ${targetUser.email} (Safe Deactivation)`,
    });

    return NextResponse.json({ ok: true, action: "deactivated" });
  } catch (error) {
    return authErrorResponse(error, "Failed to deactivate or delete user");
  }
}
