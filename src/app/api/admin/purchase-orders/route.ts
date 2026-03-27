import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { connectDB } from "@/lib/db/connect";
import { PurchaseOrderModel } from "@/lib/db/models";
import { authErrorResponse } from "@/lib/api/route-auth";
import { parsePagination, parseSearch } from "@/lib/api/pagination";

export async function GET(req: Request) {
  try {
    await requireRole(["admin"]);
    await connectDB();
    const url = new URL(req.url);
    const { page, limit, skip } = parsePagination(url.searchParams);
    const q = parseSearch(url.searchParams);
    const projectId = String(url.searchParams.get("projectId") ?? "").trim();
    const filter: Record<string, unknown> = {};
    if (q) filter.poNumber = { $regex: q, $options: "i" };
    if (projectId) filter.projectId = projectId;
    const [items, total] = await Promise.all([
      PurchaseOrderModel.find(filter)
      .select("poNumber type status fileUrl quotationId createdAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
      PurchaseOrderModel.countDocuments(filter),
    ]);
    return NextResponse.json({ items, page, limit, total, hasMore: skip + items.length < total });
  } catch (error) {
    return authErrorResponse(error, "Failed to load purchase orders");
  }
}
