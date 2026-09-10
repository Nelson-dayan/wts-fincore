import { requireRole } from "@/lib/auth/require-role";
import { connectDB } from "@/lib/db/connect";
import { CompanyModel } from "@/lib/db/models";
import { getTreasuryDashboardProjection } from "@/lib/services/projections";
import { apiSuccess, apiError } from "@/lib/api/response";
import { isNextInternalError } from "@/lib/api/standard-response";

export async function GET(req: Request) {
  try {
    await requireRole(["admin", "employee"]);
    await connectDB();

    // Resolve companyId from primary company context
    const primaryCompany = await CompanyModel.findOne({ isPrimary: true }).select("_id").lean();
    if (!primaryCompany) {
      return apiError("Primary company profile not found in system.", 404);
    }

    // Fetch the treasury read-model projection
    const projection = await getTreasuryDashboardProjection(String(primaryCompany._id));

    return apiSuccess({
      projection
    });
  } catch (error: any) {
    if (isNextInternalError(error)) throw error;
    console.error("TREASURY PROJECTION ERROR:", error);
    return apiError(error.message || "Failed to load treasury read-model projection.", 500);
  }
}
