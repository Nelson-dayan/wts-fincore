import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { UserModel } from "@/lib/db/models";
import { requireRole } from "@/lib/auth/require-role";

export async function GET() {
  try {
    await requireRole(["admin"]);
    await connectDB();

    const users = await UserModel.find()
      .select("name email role isActive phone signatureUrl createdAt updatedAt")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ users });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(
      { message: "Failed to load users" },
      { status: 500 }
    );
  }
}
