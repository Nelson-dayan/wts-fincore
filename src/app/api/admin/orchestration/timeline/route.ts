import { requireRole } from "@/lib/auth/require-role";
import { connectDB } from "@/lib/db/connect";
import { fetchChronologicalTimeline } from "@/lib/services/orchestration";
import { apiSuccess, apiError } from "@/lib/api/response";
import { isNextInternalError } from "@/lib/api/standard-response";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const session = await requireRole(["admin", "employee"]);
    await connectDB();

    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");

    if (!entityType || !entityId) {
      return apiError("entityType and entityId query parameters are required.", 400);
    }

    if (!mongoose.Types.ObjectId.isValid(entityId)) {
      return apiError("Invalid entityId format.", 400);
    }

    const timeline = await fetchChronologicalTimeline(entityType, entityId);

    return apiSuccess({
      timeline
    });
  } catch (error: any) {
    if (isNextInternalError(error)) throw error;
    console.error("TIMELINE FETCH ERROR:", error);
    return apiError(error.message || "Failed to fetch timeline logs", 500);
  }
}
