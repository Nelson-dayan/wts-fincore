import { requireRole } from "@/lib/auth/require-role";
import { connectDB } from "@/lib/db/connect";
import { executeTransition } from "@/lib/services/orchestration";
import { apiSuccess, apiError } from "@/lib/api/response";
import { QuotationModel, PurchaseOrderModel, InvoiceModel, ProjectModel } from "@/lib/db/models";
import { authorizeResource } from "@/lib/auth/authorization";
import type { ResourceAction } from "@/lib/auth/permissions";

const POLICY_PERMISSION_MAP: Record<string, { model: any; permission: ResourceAction; resourceType: string }> = {
  "POL-QTN-001": { model: QuotationModel, permission: "quotations.approve", resourceType: "quotation" },
  "POL-QTN-002": { model: QuotationModel, permission: "quotations.send", resourceType: "quotation" },
  "POL-QTN-003": { model: QuotationModel, permission: "quotations.reject", resourceType: "quotation" },
  "POL-PO-001": { model: PurchaseOrderModel, permission: "purchaseOrders.approve", resourceType: "purchase_order" },
  "POL-PO-002": { model: PurchaseOrderModel, permission: "purchaseOrders.edit", resourceType: "purchase_order" },
  "POL-INV-001": { model: InvoiceModel, permission: "invoices.send", resourceType: "invoice" },
  "POL-INV-002": { model: InvoiceModel, permission: "invoices.markPaid", resourceType: "invoice" },
  "POL-INV-003": { model: InvoiceModel, permission: "invoices.void", resourceType: "invoice" },
  "POL-PRJ-001": { model: ProjectModel, permission: "projects.edit", resourceType: "project" },
  "POL-PRJ-002": { model: ProjectModel, permission: "projects.edit", resourceType: "project" },
  "POL-PRJ-003": { model: ProjectModel, permission: "projects.edit", resourceType: "project" },
};

export async function POST(req: Request) {
  try {
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

    const config = POLICY_PERMISSION_MAP[policyId];
    if (!config) {
      return apiError(`Unknown policyId: ${policyId}`, 400);
    }

    const doc = await config.model.findById(entityId).select("companyId projectId").lean();
    if (!doc) {
      return apiError("Target entity document not found", 404);
    }

    const targetCompanyId = doc.companyId ? String(doc.companyId) : undefined;
    const targetProjectId = doc.projectId ? String(doc.projectId) : (config.resourceType === "project" ? String(doc._id) : undefined);

    const auth = await authorizeResource({
      permission: config.permission,
      companyId: targetCompanyId,
      projectId: targetProjectId,
    });

    if (!auth.authorized) {
      return apiError(auth.reason || "Unauthorized to execute transition", 403, auth.code);
    }

    const session = auth.session;

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
