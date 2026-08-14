import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-role";
import { connectDB } from "@/lib/db/connect";
import { UserModel } from "@/lib/db/models";
import { verifyPassword } from "@/lib/auth/password";
import { canUserAccessCompany } from "@/lib/auth/user-company-access";
import { apiSuccess, apiError } from "@/lib/api/response";

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    await connectDB();

    const body = (await req.json()) as { targetCompanyId?: string; password?: string };
    const targetCompanyId = body.targetCompanyId?.trim();
    const password = body.password;

    if (!targetCompanyId) {
      return apiError("targetCompanyId is required", 400);
    }

    if (!password) {
      return apiError("Password confirmation is required", 400);
    }

    const user = await UserModel.findById(session.user.id).select("+password role");
    if (!user) {
      return apiError("User not found", 404);
    }

    // Step 1: Verify Password
    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      return apiError("Authentication failed. Invalid credentials or unauthorized context.", 401);
    }

    // Step 2: Verify Company/Group Access (Password verification NEVER grants unassigned access)
    const hasCompanyAccess = await canUserAccessCompany(
      session.user.id,
      targetCompanyId,
      user.role
    );

    if (!hasCompanyAccess) {
      return apiError("Authentication failed. Invalid credentials or unauthorized context.", 403);
    }

    return apiSuccess({
      ok: true,
      targetCompanyId,
      message: "Company context switch verified successfully.",
    });
  } catch (error) {
    console.error("Verify Company Switch Error:", error);
    return apiError("Company context verification failed", 500);
  }
}
