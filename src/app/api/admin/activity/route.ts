import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { connectDB } from "@/lib/db/connect";
import { ActivityLogModel } from "@/lib/db/models";
import { authErrorResponse } from "@/lib/api/route-auth";
import { parsePagination, parseSearch } from "@/lib/api/pagination";

export async function GET(req: Request) {
  try {
    await requireRole(["admin"]);
    await connectDB();
    const url = new URL(req.url);
    const { page, limit, skip } = parsePagination(url.searchParams);
    const q = parseSearch(url.searchParams);
    const filter = q
      ? {
          $or: [
            { action: { $regex: q, $options: "i" } },
            { entityType: { $regex: q, $options: "i" } },
            { message: { $regex: q, $options: "i" } },
          ],
        }
      : {};
    const [items, total] = await Promise.all([
      ActivityLogModel.find(filter)
      .select("action entityType message createdAt userId")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
      ActivityLogModel.countDocuments(filter),
    ]);
    return NextResponse.json({ items, page, limit, total, hasMore: skip + items.length < total });
  } catch (error) {
    return authErrorResponse(error, "Failed to load activity logs");
  }
}
