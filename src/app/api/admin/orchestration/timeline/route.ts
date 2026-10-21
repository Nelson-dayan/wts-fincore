import { requireRole } from "@/lib/auth/require-role";
import { connectDB } from "@/lib/db/connect";
import { fetchChronologicalTimeline } from "@/lib/services/orchestration";
import { apiSuccess, apiError } from "@/lib/api/response";
import { isNextInternalError } from "@/lib/api/standard-response";
import { QuotationModel, PurchaseOrderModel, InvoiceModel, ProjectModel } from "@/lib/db/models";
import { authorizeResource } from "@/lib/auth/authorization";
import type { ResourceAction } from "@/lib/auth/permissions";
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

    let model: mongoose.Model<any> | null = null;
    let permission: ResourceAction = "projects.view";
    switch (entityType) {
      case "quotation":
        model = QuotationModel;
        permission = "quotations.view";
        break;
      case "purchase_order":
        model = PurchaseOrderModel;
        permission = "purchaseOrders.view";
        break;
      case "invoice":
        model = InvoiceModel;
        permission = "invoices.view";
        break;
      case "project":
        model = ProjectModel;
        permission = "projects.view";
        break;
    }

    if (model) {
      const doc = await model.findById(entityId).select("companyId projectId").lean();
      if (!doc) {
        return apiError(`${entityType} document not found.`, 404);
      }

      const targetCompanyId = (doc as any).companyId ? String((doc as any).companyId) : undefined;
      const targetProjectId = (doc as any).projectId ? String((doc as any).projectId) : (entityType === "project" ? String(doc._id) : undefined);

      const auth = await authorizeResource({
        permission,
        companyId: targetCompanyId,
        projectId: targetProjectId,
      });

      if (!auth.authorized) {
        return apiError(auth.reason || "Forbidden", 403, auth.code);
      }
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
