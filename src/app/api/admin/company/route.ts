import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { connectDB } from "@/lib/db/connect";
import { CompanySettingsModel } from "@/lib/db/models";
import { authErrorResponse } from "@/lib/api/route-auth";

export async function GET() {
  try {
    await requireRole(["admin"]);
    await connectDB();
    const item = await CompanySettingsModel.findOne().lean();
    return NextResponse.json({ item });
  } catch (error) {
    return authErrorResponse(error, "Failed to load company settings");
  }
}
