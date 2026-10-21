import { requireRole } from "@/lib/auth/require-role";
import { connectDB } from "@/lib/db/connect";
import { ActivityLogModel } from "@/lib/db/models";
import { apiSuccess, apiError } from "@/lib/api/response";
import { parsePagination, parseSearch, escapeRegex, InvalidSearchParameterError } from "@/lib/api/pagination";
import { isNextInternalError } from "@/lib/api/standard-response";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    await requireRole(["admin"]);
    await connectDB();
    const url = new URL(req.url);
    const { page, limit, skip } = parsePagination(url.searchParams);
    const q = parseSearch(url.searchParams);
    const escaped = q ? escapeRegex(q) : "";
    const projectId = url.searchParams.get("projectId");
    const filter: Record<string, unknown> = escaped
      ? {
          $or: [
            { action: { $regex: escaped, $options: "i" } },
            { entityType: { $regex: escaped, $options: "i" } },
            { message: { $regex: escaped, $options: "i" } },
          ],
        }
      : {};

    if (projectId) {
      filter.projectId = projectId;
    }
    const [items, total] = await Promise.all([
      ActivityLogModel.find(filter)
      .select("action entityType message createdAt userId metadata")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
      ActivityLogModel.countDocuments(filter),
    ]);
    return apiSuccess({ items, page, limit, total, hasMore: skip + items.length < total });
  } catch (error) {
    if (isNextInternalError(error)) throw error;
    if (
      error instanceof InvalidSearchParameterError ||
      (error instanceof Error &&
        (error.message === "Invalid search parameter" ||
          error.name === "InvalidSearchParameterError" ||
          error.message.includes("Invalid search parameter") ||
          error.message.includes("Search parameter exceeds maximum allowed length")))
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid search parameter",
          message: error instanceof Error ? error.message : "Invalid search parameter",
        },
        { status: 400 }
      );
    }
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return apiError("Unauthorized", 401);
    }
    console.error("Activity API Error:", error);
    return apiError("Failed to load activity logs", 500);
  }
}
