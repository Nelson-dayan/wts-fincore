import { requireRole } from "@/lib/auth/require-role";
import { connectDB } from "@/lib/db/connect";
import { exportPolicyManifest } from "@/lib/services/orchestration";
import { apiSuccess, apiError } from "@/lib/api/response";
import { isNextInternalError } from "@/lib/api/standard-response";

export async function GET(req: Request) {
  try {
    await requireRole(["admin", "employee"]);
    await connectDB();

    const manifest = exportPolicyManifest();

    return apiSuccess({
      manifest
    });
  } catch (error: any) {
    if (isNextInternalError(error)) throw error;
    console.error("MANIFEST EXPORT ERROR:", error);
    return apiError(error.message || "Failed to export policy manifest", 500);
  }
}
