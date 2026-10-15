import { requireRole } from "@/lib/auth/require-role";
import { connectDB } from "@/lib/db/connect";
import { CompanyModel } from "@/lib/db/models";
import { getTreasuryDashboardProjection } from "@/lib/services/projections";
import { apiSuccess, apiError } from "@/lib/api/response";
import { isNextInternalError } from "@/lib/api/standard-response";
import { resolveAuthCompanyContext } from "@/lib/auth/company-context";

export async function GET(req: Request) {
  try {
    const session = await requireRole(["admin", "employee"]);
    await connectDB();

    const url = new URL(req.url);
    const targetCompanyId = req.headers.get("x-company-id") || url.searchParams.get("companyId");
    const scopeMode = (req.headers.get("x-scope-mode") || url.searchParams.get("scopeMode")) as "single" | "group" || "single";

    const companyContext = await resolveAuthCompanyContext(session.user, targetCompanyId, scopeMode);
    const effectiveCompanyId = companyContext.activeCompanyId;

    if (!effectiveCompanyId) {
      return apiError("Company context not found.", 404);
    }

    // Fetch the treasury read-model projection for authorized active company
    const projection = await getTreasuryDashboardProjection(effectiveCompanyId);

    return apiSuccess({
      projection
    });
  } catch (error: any) {
    if (isNextInternalError(error)) throw error;
    console.error("TREASURY PROJECTION ERROR:", error);
    return apiError(error.message || "Failed to load treasury read-model projection.", 500);
  }
}
