import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { connectDB } from "@/lib/db/connect";
import { ProjectModel } from "@/lib/db/models";
import { authErrorResponse } from "@/lib/api/route-auth";
import { parsePagination, parseSearch } from "@/lib/api/pagination";

export async function GET(req: Request) {
  try {
    const session = await requireRole(["admin", "employee"]);
    await connectDB();
    const url = new URL(req.url);
    const { page, limit, skip } = parsePagination(url.searchParams);
    const q = parseSearch(url.searchParams);
    const filter = {
      assignedTo: session.user.id,
      ...(q ? { name: { $regex: q, $options: "i" } } : {}),
    };
    const [items, total] = await Promise.all([
      ProjectModel.find(filter)
      .select("name status priority budget currency updatedAt")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
      ProjectModel.countDocuments(filter),
    ]);
    return NextResponse.json({ items, page, limit, total, hasMore: skip + items.length < total });
  } catch (error) {
    return authErrorResponse(error, "Failed to load projects");
  }
}
