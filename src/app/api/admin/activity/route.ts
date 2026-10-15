import { Types } from "mongoose";
import { requireRole } from "@/lib/auth/require-role";
import { connectDB } from "@/lib/db/connect";
import { ActivityLogModel, ProjectModel } from "@/lib/db/models";
import { apiSuccess, apiError } from "@/lib/api/response";
import { parsePagination, parseSearch, escapeRegex } from "@/lib/api/pagination";
import { isNextInternalError } from "@/lib/api/standard-response";
import { resolveAuthCompanyContext } from "@/lib/auth/company-context";

export async function GET(req: Request) {
  try {
    const session = await requireRole(["admin"]);
    await connectDB();
    const url = new URL(req.url);
    const { page, limit, skip } = parsePagination(url.searchParams);
    const q = parseSearch(url.searchParams);
    const projectId = url.searchParams.get("projectId");

    const targetCompanyId = req.headers.get("x-company-id") || url.searchParams.get("companyId") || undefined;
    const requestedScopeMode = (req.headers.get("x-scope-mode") || url.searchParams.get("scopeMode")) as "single" | "group" || "single";

    const companyContext = await resolveAuthCompanyContext(session.user, targetCompanyId, requestedScopeMode);
    const allowedCompanyIds = companyContext.allowedCompanyIds.map((id) =>
      typeof id === "string" ? new Types.ObjectId(id) : id
    );

    // Resolve projects belonging to allowed companies
    const allowedProjectIds = await ProjectModel.find({
      companyId: { $in: allowedCompanyIds },
    }).distinct("_id");

    const scopeFilter: Record<string, any> = {
      $or: [
        { projectId: { $in: allowedProjectIds } },
        { entityType: "company", entityId: { $in: allowedCompanyIds } },
        { "metadata.companyId": { $in: companyContext.allowedCompanyIds } },
      ],
    };

    if (projectId) {
      if (!allowedProjectIds.map(String).includes(projectId)) {
        return apiSuccess({ items: [], page, limit, total: 0, hasMore: false });
      }
      delete scopeFilter.$or;
      scopeFilter.projectId = projectId;
    }

    let filter: Record<string, any> = scopeFilter;

    if (q) {
      const searchCond = {
        $or: [
          { action: { $regex: escapeRegex(q), $options: "i" } },
          { entityType: { $regex: escapeRegex(q), $options: "i" } },
          { message: { $regex: escapeRegex(q), $options: "i" } },
        ],
      };
      filter = { $and: [scopeFilter, searchCond] };
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
