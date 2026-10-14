import { requireRole } from "@/lib/auth/require-role";
import { connectDB } from "@/lib/db/connect";
import { ActivityLogModel } from "@/lib/db/models";
import { apiSuccess, apiError } from "@/lib/api/response";
import { parsePagination, parseSearch, escapeRegex } from "@/lib/api/pagination";
import { isNextInternalError } from "@/lib/api/standard-response";

export async function GET(req: Request) {
  try {
    await requireRole(["admin"]);
    await connectDB();
    const url = new URL(req.url);
    const { page, limit, skip } = parsePagination(url.searchParams);
    const q = parseSearch(url.searchParams);
    const projectId = url.searchParams.get("projectId");
    const filter: Record<string, unknown> = q
      ? {
          $or: [
            { action: { $regex: escapeRegex(q), $options: "i" } },
            { entityType: { $regex: escapeRegex(q), $options: "i" } },
            { message: { $regex: escapeRegex(q), $options: "i" } },
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
  } catch (error: any) {
    if (isNextInternalError(error)) throw error;
    if (error?.statusCode === 400 || error?.name === "InvalidQueryParamError") {
      return apiError(error.message, 400);
    }
    console.error("Activity API Error:", error);
    return apiError("Failed to load activity logs", 500);
  }
}
