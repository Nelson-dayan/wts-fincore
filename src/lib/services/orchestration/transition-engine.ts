import mongoose from "mongoose";
import { ALL_TRANSITION_POLICIES } from "./transition-policies";
import { logTransitionAudit } from "./audit-engine";
import { generateEventFingerprint, checkOrRegisterEventFingerprint, updateEventFingerprintStatus } from "./idempotency";
import { QuotationModel, PurchaseOrderModel, InvoiceModel, ProjectModel } from "@/lib/db/models";

export interface TransitionExecutionResult {
  success: boolean;
  transitionId?: string;
  message?: string;
  blockers?: string[];
}

export async function executeTransition(params: {
  policyId: string;
  entityId: string;
  approvedBy: string;
  triggerEvent: string;
  route: string;
  customData?: any;
}): Promise<TransitionExecutionResult> {
  const policy = ALL_TRANSITION_POLICIES[params.policyId];
  if (!policy) {
    return { success: false, message: `Orchestration policy ${params.policyId} does not exist.` };
  }

  // 1. Load the active model and document
  let model: mongoose.Model<any>;
  switch (policy.entityType) {
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
      return { success: false, message: `Unsupported entity type: ${policy.entityType}` };
  }

  const doc = await model.findById(params.entityId);
  if (!doc) {
    return { success: false, message: `${policy.entityType} document ${params.entityId} not found.` };
  }

  // 2. Enforce idempotency fingerprint checks to block concurrent duplicate queries
  const fingerprint = generateEventFingerprint({
    eventType: params.triggerEvent,
    entityId: params.entityId,
    timestamp: Date.now()
  });

  const lock = await checkOrRegisterEventFingerprint({
    fingerprint,
    userId: params.approvedBy,
    route: params.route
  });

  if (!lock.ok) {
    return { success: false, message: lock.message };
  }

  // 3. Execute validations against blockers
  const blockers: string[] = [];
  for (const condition of policy.conditions) {
    try {
      const check = await condition.validate(doc);
      if (!check.ok) {
        blockers.push(check.blocker || condition.description);
      }
    } catch (err: any) {
      blockers.push(`Condition verification error (${condition.code}): ${err.message}`);
    }
  }

  if (blockers.length > 0) {
    await updateEventFingerprintStatus(fingerprint, params.approvedBy, "FAILED");
    return { success: false, message: "Transition blocked by validation conditions.", blockers };
  }

  const fromStatus = doc.status;

  // 4. Update the status and execute save operation
  try {
    doc.status = policy.to;
    await doc.save();

    // 5. Write the Audit record
    const transitionId = await logTransitionAudit({
      triggerEvent: params.triggerEvent,
      entityType: policy.entityType,
      entityId: params.entityId,
      fromStatus,
      toStatus: policy.to,
      approvedBy: params.approvedBy,
      fingerprint,
      projectId: doc.projectId ? String(doc.projectId) : undefined,
      metadata: params.customData
    });

    // 6. Finalize successfully and update idempotency lock status
    await updateEventFingerprintStatus(fingerprint, params.approvedBy, "SUCCESS");
    return { success: true, transitionId };
  } catch (err: any) {
    await updateEventFingerprintStatus(fingerprint, params.approvedBy, "FAILED");
    return { success: false, message: err.message || "Failed to commit transition updates to database." };
  }
}
