import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { connectDB } from "@/lib/db/connect";
import { ProjectModel } from "@/lib/db/models";
import { authErrorResponse } from "@/lib/api/route-auth";

export async function GET() {
  try {
    const session = await requireRole(["admin", "employee"]);
    await connectDB();
    const items = await ProjectModel.find({ assignedTo: session.user.id })
      .select("name status priority budget updatedAt")
      .sort({ updatedAt: -1 })
      .limit(100)
      .lean();
    return NextResponse.json({ items });
  } catch (error) {
    return authErrorResponse(error, "Failed to load projects");
  }
}
