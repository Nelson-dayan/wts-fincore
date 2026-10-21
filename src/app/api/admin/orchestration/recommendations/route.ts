import { requireRole } from "@/lib/auth/require-role";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db/connect";
import { assessTransitions } from "@/lib/services/orchestration";
import { QuotationModel, PurchaseOrderModel, InvoiceModel, ProjectModel } from "@/lib/db/models";
import { apiSuccess, apiError } from "@/lib/api/response";
import { isNextInternalError } from "@/lib/api/standard-response";
import { authorizeResource } from "@/lib/auth/authorization";
import type { ResourceAction } from "@/lib/auth/permissions";

export async function GET(req: Request) {
  try {
    const session = await requireRole(["admin", "employee"]);
    await connectDB();

    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get("entityType") as "quotation" | "purchase_order" | "invoice" | "project" | "client";
    const entityId = searchParams.get("entityId");

    if (!entityType || !entityId) {
      return apiError("entityType and entityId query parameters are required.", 400);
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

    const targetCompanyId = (doc as any).companyId ? String((doc as any).companyId) : undefined;
    const targetProjectId = (doc as any).projectId ? String((doc as any).projectId) : (entityType === "project" ? String(doc._id) : undefined);

    const permissionMap: Record<string, ResourceAction> = {
      quotation: "quotations.view",
      purchase_order: "purchaseOrders.view",
      invoice: "invoices.view",
      project: "projects.view",
    };

    const auth = await authorizeResource({
      permission: permissionMap[entityType] || "projects.view",
      companyId: targetCompanyId,
      projectId: targetProjectId,
    });

    if (!auth.authorized) {
      return apiError(auth.reason || "Forbidden", 403, auth.code);
    }

    const recommendations = await assessTransitions({
      entityType,
      entity: doc
    });

    return apiSuccess({
      recommendations
    });
  } catch (error: any) {
    if (isNextInternalError(error)) throw error;
    console.error("RECOMMENDATIONS FETCH ERROR:", error);
    return apiError(error.message || "Failed to fetch recommendations", 500);
  }
}
