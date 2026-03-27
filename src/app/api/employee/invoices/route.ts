import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { connectDB } from "@/lib/db/connect";
import { InvoiceModel } from "@/lib/db/models";
import { authErrorResponse } from "@/lib/api/route-auth";

export async function GET() {
  try {
    const session = await requireRole(["admin", "employee"]);
    await connectDB();
    const items = await InvoiceModel.find({ createdBy: session.user.id })
      .select("invoiceNumber status dueDate projectId createdAt")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    return NextResponse.json({ items });
  } catch (error) {
    return authErrorResponse(error, "Failed to load invoices");
  }
}
