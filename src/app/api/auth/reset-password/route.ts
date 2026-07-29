import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { UserModel } from "@/lib/db/models";
import { hashPassword } from "@/lib/auth/password";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const token = String(body.token || "").trim();
    const password = String(body.password || "").trim();

    if (!email || !token || !password) {
      return NextResponse.json(
        { message: "Missing required fields." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { message: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    await connectDB();

    // Query user with select explicitly including hidden token fields
    const user = await UserModel.findOne({
      email,
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    }).select("+resetPasswordToken +resetPasswordExpires");

    if (!user) {
      return NextResponse.json(
        { message: "Invalid or expired password reset link. Please request a new one." },
        { status: 400 }
      );
    }

    const hashed = await hashPassword(password);
    user.password = hashed;
    user.resetPasswordToken = null as any;
    user.resetPasswordExpires = null as any;
    await user.save();

    return NextResponse.json({
      ok: true,
      message: "Password reset successful! You can now log in with your new password.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to reset password" },
      { status: 500 }
    );
  }
}
