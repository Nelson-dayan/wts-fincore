import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { connectDB } from "@/lib/db/connect";
import { QuotationModel } from "@/lib/db/models";
import { authErrorResponse } from "@/lib/api/route-auth";

export async function GET() {
  try {
    await requireRole(["admin"]);
    await connectDB();
    const items = await QuotationModel.find()
      .select("quotationNumber status projectId createdAt")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    return NextResponse.json({ items });
  } catch (error) {
    return authErrorResponse(error, "Failed to load quotations");
  }
}
