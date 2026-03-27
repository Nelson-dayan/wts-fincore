import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { connectDB } from "@/lib/db/connect";
import { CompanyModel } from "@/lib/db/models";
import { authErrorResponse } from "@/lib/api/route-auth";

export async function GET() {
  try {
    await requireRole(["admin"]);
    await connectDB();
    const items = await CompanyModel.find()
      .select("_id name email")
      .sort({ updatedAt: -1 })
      .limit(25)
      .lean();
    return NextResponse.json({ items });
  } catch (error) {
    return authErrorResponse(error, "Failed to load company options");
  }
}
