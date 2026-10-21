import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db/connect";
import { UserModel, CompanyModel } from "@/lib/db/models";
import { requireSession } from "@/lib/auth/require-role";
import { apiSuccess, apiError, standardAuthError } from "@/lib/api/standard-response";
import { logActivity } from "@/lib/services/activity/log-activity.service";
import { hashPassword, verifyPassword, validatePasswordComplexity } from "@/lib/auth/password";
import { normalizePhoneInput } from "@/lib/register/validate";
import { getUserAccessInfo } from "@/lib/auth/user-company-access";

export async function GET() {
  try {
    const session = await requireSession();
    await connectDB();

    const user = await UserModel.findById(session.user.id)
      .select("_id name email role phone phoneNumber signatureUrl defaultCompanyId companyMemberships isActive createdAt updatedAt")
      .lean();

    if (!user) {
      return apiError("User not found", 404);
    }

    const accessInfo = await getUserAccessInfo(session.user.id, user.role);

    // Fetch details for companies the user has access to
    const companies = await CompanyModel.find({
      _id: { $in: accessInfo.allowedCompanyIds.map((id) => new Types.ObjectId(id)) },
      isActive: true,
      deletedAt: null,
    })
      .select("_id name code baseCurrency isPrimary kind")
      .lean();

    return apiSuccess({
      user: {
        id: user._id.toString(),
        name: user.name || "",
        email: user.email,
        role: user.role,
        phone: user.phone || user.phoneNumber || "",
        signatureUrl: user.signatureUrl || "",
        defaultCompanyId: user.defaultCompanyId ? user.defaultCompanyId.toString() : null,
        companyMemberships: user.companyMemberships || [],
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      companies: companies.map((c) => ({
        _id: c._id.toString(),
        name: c.name,
        code: c.code,
        baseCurrency: c.baseCurrency,
        isPrimary: Boolean(c.isPrimary),
        kind: c.kind,
      })),
      isSuperAdmin: accessInfo.isSuperAdmin,
    });
  } catch (error) {
    return standardAuthError(error, "Failed to load user profile");
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await requireSession();
    await connectDB();

    const body = (await req.json()) as {
      name?: string;
      phone?: string;
      signatureUrl?: string;
      defaultCompanyId?: string | null;
      currentPassword?: string;
      newPassword?: string;
    };

    const user = await UserModel.findById(session.user.id).select("+password");
    if (!user) {
      return apiError("User not found", 404);
    }

    const changedFields: string[] = [];

    // 1. Name update
    if (body.name !== undefined) {
      const trimmed = String(body.name).trim();
      if (!trimmed || trimmed.length < 2) {
        return apiError("Name must be at least 2 characters long", 400);
      }
      if (trimmed.length > 100) {
        return apiError("Name cannot exceed 100 characters", 400);
      }
      if (user.name !== trimmed) {
        user.name = trimmed;
        changedFields.push("name");
      }
    }

    // 2. Phone update
    if (body.phone !== undefined) {
      const normalized = normalizePhoneInput(String(body.phone));
      if (user.phone !== normalized) {
        user.phone = normalized;
        user.phoneNumber = normalized;
        changedFields.push("phone");
      }
    }

    // 3. Signature update
    if (body.signatureUrl !== undefined) {
      const sig = String(body.signatureUrl).trim();
      if (user.signatureUrl !== sig) {
        user.signatureUrl = sig;
        changedFields.push("signatureUrl");
      }
    }

    // 4. Default company update
    if (body.defaultCompanyId !== undefined) {
      if (body.defaultCompanyId && Types.ObjectId.isValid(body.defaultCompanyId)) {
        const targetCompanyId = new Types.ObjectId(body.defaultCompanyId);
        const accessInfo = await getUserAccessInfo(session.user.id, user.role);
        if (
          !accessInfo.isSuperAdmin &&
          !accessInfo.allowedCompanyIds.includes(body.defaultCompanyId)
        ) {
          return apiError("You do not have access to the selected company", 403);
        }
        user.defaultCompanyId = targetCompanyId;
        changedFields.push("defaultCompanyId");
      } else if (!body.defaultCompanyId) {
        user.defaultCompanyId = null;
        changedFields.push("defaultCompanyId");
      }
    }

    // 5. Password update
    let passwordChanged = false;
    if (body.newPassword !== undefined && String(body.newPassword).trim() !== "") {
      const newPass = String(body.newPassword).trim();
      if (!body.currentPassword) {
        return apiError("Please provide your current password to set a new password", 400);
      }
      const valid = await verifyPassword(body.currentPassword, user.password);
      if (!valid) {
        return apiError("Current password is incorrect", 400);
      }
      const passCheck = validatePasswordComplexity(newPass, user.email);
      if (!passCheck.valid) {
        return apiError(passCheck.error || "New password does not meet complexity requirements", 400);
      }
      user.password = await hashPassword(newPass);
      user.resetPasswordToken = null;
      user.resetPasswordExpires = null;
      passwordChanged = true;
      changedFields.push("password");
    }

    if (changedFields.length > 0) {
      await user.save();

      await logActivity({
        userId: session.user.id,
        action: "updated_user",
        entityType: "user",
        entityId: user._id.toString(),
        message: passwordChanged
          ? `User ${user.email} updated password and profile`
          : `User ${user.email} updated profile (${changedFields.join(", ")})`,
        metadata: { changedFields },
      });
    }

    const updatedUser = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone || user.phoneNumber || "",
      signatureUrl: user.signatureUrl || "",
      defaultCompanyId: user.defaultCompanyId ? user.defaultCompanyId.toString() : null,
      companyMemberships: user.companyMemberships || [],
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return apiSuccess({
      user: updatedUser,
      message: passwordChanged
        ? "Profile and password updated successfully"
        : "Profile updated successfully",
    });
  } catch (error) {
    return standardAuthError(error, "Failed to update profile");
  }
}
