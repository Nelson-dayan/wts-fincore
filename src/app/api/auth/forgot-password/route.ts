import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/db/connect";
import { UserModel } from "@/lib/db/models";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { message: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    await connectDB();
    const user = await UserModel.findOne({ email });

    if (!user) {
      // Return success to avoid email enumeration security issues
      return NextResponse.json({
        ok: true,
        message: "If an account with that email exists, a password reset link has been generated.",
      });
    }

    // Generate secure random reset token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour validity

    user.resetPasswordToken = rawToken;
    user.resetPasswordExpires = expires;
    await user.save();

    // Construct the reset URL
    const origin = req.headers.get("origin") || req.headers.get("host") || "";
    const protocol = origin.includes("localhost") || origin.includes("127.0.0.1") ? "http" : "https";
    const baseUrl = origin.startsWith("http") ? origin : `${protocol}://${origin}`;
    const resetUrl = `${baseUrl}/reset-password?token=${rawToken}&email=${encodeURIComponent(email)}`;

    return NextResponse.json({
      ok: true,
      message: "If an account with that email exists, a password reset link has been generated.",
      resetUrl, // Include reset URL so user can immediately click in dev/test environment
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to process request" },
      { status: 500 }
    );
  }
}
