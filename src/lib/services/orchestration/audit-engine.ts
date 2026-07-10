import { ActivityLogModel, InvoiceModel, PurchaseOrderModel, QuotationModel } from "@/lib/db/models";

export interface OrchestrationTransitionLog {
  transitionId: string;
  triggerEvent: string;
  fromStatus: string;
  toStatus: string;
  approvedBy: string;
  fingerprint: string;
  timestamp: string;
  metadata?: any;
}

export function generateTransitionId(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomStr = Math.floor(10000 + Math.random() * 90000).toString();
  return `TRX-${dateStr}-${randomStr}`;
}

export async function logTransitionAudit(params: {
  triggerEvent: string;
  entityType: "quotation" | "purchase_order" | "invoice" | "project" | "client";
  entityId: string;
  fromStatus: string;
  toStatus: string;
  approvedBy: string;
  fingerprint: string;
  projectId?: string;
  metadata?: any;
}, session?: any): Promise<string> {
  const transitionId = generateTransitionId();

  const auditRecord: OrchestrationTransitionLog = {
    transitionId,
    triggerEvent: params.triggerEvent,
    fromStatus: params.fromStatus,
    toStatus: params.toStatus,
    approvedBy: params.approvedBy,
    fingerprint: params.fingerprint,
    timestamp: new Date().toISOString(),
    metadata: params.metadata
  };

  await ActivityLogModel.create([
    {
      userId: params.approvedBy,
      action: "ORCHESTRATED_TRANSITION",
      entityType: params.entityType.toUpperCase(),
      entityId: params.entityId,
      projectId: params.projectId,
      message: `Transitioned ${params.entityType} status from ${params.fromStatus} to ${params.toStatus} (Tx ID: ${transitionId})`,
      metadata: auditRecord
    }
  ], { session });

  return transitionId;
}

export interface TimelineEvent {
  title: string;
  description: string;
  timestamp: string;
  userId?: string;
  action: string;
  transitionId?: string;
}

export async function fetchChronologicalTimeline(
  entityType: string,
  entityId: string
): Promise<TimelineEvent[]> {
  try {
    const logs = await ActivityLogModel.find({
      entityType: entityType.toUpperCase(),
      entityId: entityId
    })
      .sort({ createdAt: 1 })
      .lean();

    const events: TimelineEvent[] = logs.map((log: any) => {
      const isTransition = log.action === "ORCHESTRATED_TRANSITION";
      const transitionId = log.metadata?.transitionId;
      
      let title = log.action.replace(/_/g, " ");
      let description = log.message;

      if (isTransition) {
        title = `Status updated: ${log.metadata?.toStatus}`;
        description = `Transitioned from ${log.metadata?.fromStatus} to ${log.metadata?.toStatus} by user.`;
      }

      return {
        title,
        description,
        timestamp: log.createdAt ? log.createdAt.toISOString() : new Date().toISOString(),
        userId: log.userId ? String(log.userId) : undefined,
        action: log.action,
        transitionId
      };
    });

    if (events.length === 0) {
      let createdAt = new Date();
      let docNo = "Document";
      let status = "DRAFT";

      try {
        if (entityType === "invoice") {
          const doc = await InvoiceModel.findById(entityId).lean();
          if (doc) {
            createdAt = doc.createdAt || (doc as any).documentInfo?.date || new Date();
            docNo = `Invoice #${doc.invoiceNumber}`;
            status = doc.status || "DRAFT";
          }
        } else if (entityType === "purchase_order") {
          const doc = await PurchaseOrderModel.findById(entityId).lean();
          if (doc) {
            createdAt = doc.createdAt || new Date();
            docNo = `PO #${doc.poNumber}`;
            status = doc.status || "linked";
          }
        } else if (entityType === "quotation") {
          const doc = await QuotationModel.findById(entityId).lean();
          if (doc) {
            createdAt = doc.createdAt || (doc as any).documentInfo?.date || new Date();
            docNo = `Quotation #${doc.quotationNumber}`;
            status = doc.status || "draft";
          }
        }
      } catch (e) {
        console.warn("Failed to dynamically fetch timeline creator:", e);
      }

      events.push({
        title: `${entityType === "invoice" ? "Invoice" : entityType === "purchase_order" ? "PO" : "Quotation"} Created`,
        description: `${docNo} was initialized and created in the system with status: ${status}.`,
        timestamp: createdAt.toISOString(),
        action: "DOCUMENT_CREATED"
      });
    }

    return events;
  } catch (err) {
    console.error("Failed to compile chronological timeline:", err);
    return [];
  }
}
