import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/db/connect";
import { UserModel } from "@/lib/db/models";
import { hashPassword, validatePasswordComplexity } from "@/lib/auth/password";

export async function POST(req: Request) {
  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { message: "Invalid JSON payload." },
        { status: 400 }
      );
    }

    const email = String(body?.email || "").trim().toLowerCase();
    const token = String(body?.token || "").trim();
    const password = String(body?.password || "").trim();

    if (!email || !token || !password) {
      return NextResponse.json(
        { message: "Missing required fields." },
        { status: 400 }
      );
    }

    const passCheck = validatePasswordComplexity(password, email);
    if (!passCheck.ok || !passCheck.valid) {
      return NextResponse.json(
        {
          message:
            passCheck.message ||
            passCheck.error ||
            "Password does not meet complexity requirements.",
        },
        { status: 400 }
      );
    }

    await connectDB();

    // Compute SHA-256 hash of incoming raw token to compare against hashed DB token
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Query user with select explicitly including hidden token fields.
    // Checks hashedToken with fallback to token for smooth legacy token migration.
    const user = await UserModel.findOne({
      email,
      resetPasswordToken: { $in: [hashedToken, token] },
      resetPasswordExpires: { $gt: new Date() },
    }).select("+resetPasswordToken +resetPasswordExpires");

    if (!user) {
      return NextResponse.json(
        {
          message:
            "Invalid or expired password reset link. Please request a new one.",
        },
        { status: 400 }
      );
    }

    const hashed = await hashPassword(password);
    user.password = hashed;
    user.resetPasswordToken = null as any;
    user.resetPasswordExpires = null as any;

    // Reset lockout state upon successful authorized password reset
    user.failedLoginAttempts = 0;
    user.lockoutUntil = null as any;

    await user.save();

    return NextResponse.json({
      ok: true,
      message:
        "Password reset successful! You can now log in with your new password.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to reset password" },
      { status: 500 }
    );
  }
}
