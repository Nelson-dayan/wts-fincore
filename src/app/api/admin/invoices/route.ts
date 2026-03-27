import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { connectDB } from "@/lib/db/connect";
import { InvoiceModel } from "@/lib/db/models";
import { authErrorResponse } from "@/lib/api/route-auth";
import { parsePagination, parseSearch } from "@/lib/api/pagination";

export async function GET(req: Request) {
  try {
    await requireRole(["admin"]);
    await connectDB();
    const url = new URL(req.url);
    const { page, limit, skip } = parsePagination(url.searchParams);
    const q = parseSearch(url.searchParams);
    const filter = q ? { invoiceNumber: { $regex: q, $options: "i" } } : {};
    const [items, total] = await Promise.all([
      InvoiceModel.find(filter)
      .select("invoiceNumber status dueDate projectId createdAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
      InvoiceModel.countDocuments(filter),
    ]);
    return NextResponse.json({ items, page, limit, total, hasMore: skip + items.length < total });
  } catch (error) {
    return authErrorResponse(error, "Failed to load invoices");
  }
}
