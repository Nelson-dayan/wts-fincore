import mongoose from "mongoose";
import { ALL_TRANSITION_POLICIES, PolicyMetadata, TransitionSideEffect } from "./transition-policies";
import { logTransitionAudit } from "./audit-engine";
import { generateEventFingerprint, checkOrRegisterEventFingerprint, updateEventFingerprintStatus } from "./idempotency";
import { QuotationModel, PurchaseOrderModel, InvoiceModel, ProjectModel } from "@/lib/db/models";
import { domainEventDispatcher } from "./domain-event";

export interface TransitionExecutionResult {
  success: boolean;
  transitionId?: string;
  message?: string;
  blockers: string[];
  warnings: string[];
  sideEffects: TransitionSideEffect[];
  events: string[];
  metadata?: PolicyMetadata;
  contractVersion: string;
}

const POLICY_TO_EVENT_MAP: Record<string, string> = {
  "POL-QTN-001": "QUOTATION_APPROVED",
  "POL-QTN-002": "QUOTATION_SENT",
  "POL-QTN-003": "QUOTATION_REJECTED",
  "POL-PO-001": "PO_ACTIVATED",
  "POL-PO-002": "PO_COMPLETED",
  "POL-INV-001": "INVOICE_SENT",
  "POL-INV-002": "INVOICE_PAID",
  "POL-INV-003": "INVOICE_CANCELLED",
  "POL-PRJ-001": "PROJECT_HOLD",
  "POL-PRJ-002": "PROJECT_RESUMED",
  "POL-PRJ-003": "PROJECT_COMPLETED"
};

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
    return {
      success: false,
      message: `Orchestration policy ${params.policyId} does not exist.`,
      blockers: [`Orchestration policy ${params.policyId} does not exist.`],
      warnings: [],
      sideEffects: [],
      events: [],
      contractVersion: "v1"
    };
  }

  // 1. Resolve target Model type
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
      return {
        success: false,
        message: `Unsupported entity type: ${policy.entityType}`,
        blockers: [`Unsupported entity type: ${policy.entityType}`],
        warnings: [],
        sideEffects: [],
        events: [],
        contractVersion: "v1"
      };
  }

  // Pre-generate event fingerprint to secure distributed locks
  const fingerprint = generateEventFingerprint({
    eventType: params.triggerEvent,
    entityId: params.entityId,
    timestamp: Date.now()
  });

  // 2. Start atomic MongoDB transaction session
  const connection = mongoose.connection;
  const session = await connection.startSession();
  let result: TransitionExecutionResult = {
    success: false,
    blockers: [],
    warnings: [],
    sideEffects: [],
    events: [],
    contractVersion: "v1"
  };

  try {
    await session.withTransaction(async () => {
      // 3. Register idempotency fingerprint under session transaction context
      const lock = await checkOrRegisterEventFingerprint({
        fingerprint,
        userId: params.approvedBy,
        route: params.route
      }, session);

      if (!lock.ok) {
        throw new Error(lock.message || "Lock registration failed.");
      }

      // 4. Fetch the target document within session transaction context
      const doc = await model.findById(params.entityId).session(session);
      if (!doc) {
        throw new Error(`${policy.entityType} document ${params.entityId} not found.`);
      }

      // 5. Execute conditions validations
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

      const warnings: string[] = [];
      if (policy.entityType === "invoice") {
        const totalIntended = doc.totalsCache?.totalIntendedBase ? Number(doc.totalsCache.totalIntendedBase) : 0;
        if (totalIntended <= 0) {
          warnings.push("Invoice has an intended total amount of zero.");
        }
      }

      if (blockers.length > 0) {
        result = {
          success: false,
          message: "Transition blocked by validation conditions.",
          blockers,
          warnings,
          sideEffects: [],
          events: [],
          contractVersion: "v1"
        };
        throw new Error("VALIDATION_FAILED");
      }

      const fromStatus = doc.status;

      // 6. Mutate status and save document inside transactional session
      doc.status = policy.to;
      await doc.save({ session });

      // 7. Log Orchestrated transition audit record
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
      }, session);

      // 8. Update Lock status to SUCCESS
      await updateEventFingerprintStatus(fingerprint, params.approvedBy, "SUCCESS", session);

      const mappedEvent = POLICY_TO_EVENT_MAP[params.policyId];

      result = {
        success: true,
        transitionId,
        blockers: [],
        warnings,
        sideEffects: policy.sideEffects || [],
        events: mappedEvent ? [mappedEvent] : [],
        metadata: policy.metadata,
        contractVersion: "v1"
      };
    });

    // 9. Post-Commit Phase: Emit Domain Events to all registered subscribers
    if (result.success && result.transitionId) {
      const mappedEvent = POLICY_TO_EVENT_MAP[params.policyId];
      if (mappedEvent) {
        domainEventDispatcher.emit({
          type: mappedEvent,
          entityId: params.entityId,
          transitionId: result.transitionId,
          metadata: {
            policyId: params.policyId,
            approvedBy: params.approvedBy,
            customData: params.customData
          }
        });
      }
    }

    return result;
  } catch (err: any) {
    if (err.message === "VALIDATION_FAILED") {
      // Graceful validation failure, release the PROCESSING idempotency lease lock
      await updateEventFingerprintStatus(fingerprint, params.approvedBy, "FAILED");
      return result;
    }

    console.error("[TransitionEngine] Transaction aborted:", err);
    // Abort flow and release lock
    try {
      await updateEventFingerprintStatus(fingerprint, params.approvedBy, "FAILED");
    } catch (releaseErr) {
      console.error("[TransitionEngine] Failed to release lock on error abort:", releaseErr);
    }

    return {
      success: false,
      message: err.message || "Failed to commit transition updates to database.",
      blockers: [err.message || "Failed to commit transition updates to database."],
      warnings: [],
      sideEffects: [],
      events: [],
      contractVersion: "v1"
    };
  } finally {
    await session.endSession();
  }
}
