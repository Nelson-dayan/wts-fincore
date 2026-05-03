import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { connectDB } from "@/lib/db/connect";
import { PaymentModel } from "@/lib/db/models";
import { authErrorResponse } from "@/lib/api/route-auth";
import { parsePagination, parseSearch } from "@/lib/api/pagination";
import { recordPayment } from "@/lib/services/business/payment.service";

export async function GET(req: Request) {
  try {
    await requireRole(["admin"]);
    await connectDB();
    const url = new URL(req.url);
    const { page, limit, skip } = parsePagination(url.searchParams);
    const invoiceId = url.searchParams.get("invoiceId");
    
    const filter: Record<string, any> = { isDeleted: { $ne: true } };
    if (invoiceId) {
      filter.invoiceId = invoiceId;
    }

    const [items, total] = await Promise.all([
      PaymentModel.find(filter)
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .populate("createdBy", "name email")
      .lean(),
      PaymentModel.countDocuments(filter),
    ]);
    return NextResponse.json({ items, page, limit, total, hasMore: skip + items.length < total });
  } catch (error) {
    return authErrorResponse(error, "Failed to load payments");
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireRole(["admin"]);
    const body = await req.json();
    
    // Ensure createdBy is set from the session user
    body.createdBy = session.user.id;
    
    const result = await recordPayment(body);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return authErrorResponse(error, "Failed to record payment");
  }
}
