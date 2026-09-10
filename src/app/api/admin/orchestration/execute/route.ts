import { requireRole } from "@/lib/auth/require-role";
import { connectDB } from "@/lib/db/connect";
import { executeTransition } from "@/lib/services/orchestration";
import { apiSuccess, apiError } from "@/lib/api/response";

export async function POST(req: Request) {
  try {
    const session = await requireRole(["admin", "employee"]);
    await connectDB();

    const { policyId, entityId, triggerEvent, customData } = (await req.json()) as {
      policyId: string;
      entityId: string;
      triggerEvent: string;
      customData?: any;
    };

    if (!policyId || !entityId || !triggerEvent) {
      return apiError("Invalid parameters: policyId, entityId and triggerEvent are required.", 400);
    }

    const route = "/api/admin/orchestration/execute";
    
    const result = await executeTransition({
      policyId,
      entityId,
      approvedBy: session.user.id,
      triggerEvent,
      route,
      customData
    });

    if (!result.success) {
      return apiError(
        result.message || "Transition validation failed.",
        400,
        { blockers: result.blockers }
      );
    }

    return apiSuccess({
      transitionId: result.transitionId,
      message: "Transition executed successfully."
    });
  } catch (error: any) {
    console.error("TRANSITION EXECUTION ERROR:", error);
    return apiError(error.message || "Failed to execute orchestration transition", 500);
  }
}
