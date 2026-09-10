import { requireRole } from "@/lib/auth/require-role";
import { connectDB } from "@/lib/db/connect";
import { simulateTransition } from "@/lib/services/orchestration";
import { QuotationModel, PurchaseOrderModel, InvoiceModel, ProjectModel } from "@/lib/db/models";
import { apiSuccess, apiError } from "@/lib/api/response";
import { isNextInternalError } from "@/lib/api/standard-response";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const session = await requireRole(["admin", "employee"]);
    await connectDB();

    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get("entityType") as "quotation" | "purchase_order" | "invoice" | "project" | "client";
    const entityId = searchParams.get("entityId");
    const targetState = searchParams.get("targetState");

    if (!entityType || !entityId || !targetState) {
      return apiError("entityType, entityId, and targetState query parameters are required.", 400);
    }

    if (!mongoose.Types.ObjectId.isValid(entityId)) {
      return apiError("Invalid entityId format.", 400);
    }

    let model: mongoose.Model<any>;
    switch (entityType) {
      case "quotation":
        model = QuotationModel;
        break;
      case "purchase_order":
        model = PurchaseOrderModel;
        break;
      case "invoice":
        model = InvoiceModel;
        break;
      case "project":
        model = ProjectModel;
        break;
      default:
        return apiError(`Unsupported entity type: ${entityType}`, 400);
    }

    const doc = await model.findById(entityId).lean();
    if (!doc) {
      return apiError(`${entityType} document not found.`, 404);
    }

    const result = await simulateTransition({
      entityType,
      entity: doc,
      targetState
    });

    return apiSuccess({
      simulation: result
    });
  } catch (error: any) {
    if (isNextInternalError(error)) throw error;
    console.error("TRANSITION SIMULATION FETCH ERROR:", error);
    return apiError(error.message || "Failed to execute pre-flight transition simulation", 500);
  }
}
