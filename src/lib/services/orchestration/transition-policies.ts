import { InvoiceModel, PurchaseOrderModel, ProjectModel } from "@/lib/db/models";
import { isBalanceSettled } from "@/lib/services/finance/money";

export interface PolicyConditionResult {
  ok: boolean;
  blocker?: string;
}

export interface TransitionPolicy {
  id: string;
  entityType: "quotation" | "purchase_order" | "invoice" | "project" | "client";
  from: string[];
  to: string;
  requiresConfirmation: boolean;
  conditions: Array<{
    code: string;
    description: string;
    validate: (entity: any, ctx?: any) => Promise<PolicyConditionResult>;
  }>;
  sideEffects: string[];
}

export const QuotationApprovalPolicy: TransitionPolicy = {
  id: "POL-QTN-001",
  entityType: "quotation",
  from: ["draft", "sent"],
  to: "approved",
  requiresConfirmation: true,
  conditions: [
    {
      code: "HAS_TOTAL",
      description: "Quotation must have items and a total amount greater than 0",
      validate: async (q) => {
        const total = q.totals?.total ? Number(q.totals.total) : 0;
        return { ok: total > 0, blocker: total <= 0 ? "Quotation total must be greater than zero." : undefined };
      }
    }
  ],
  sideEffects: ["TRIGGER_PO_INITIALIZATION"]
};

export const PurchaseOrderActivePolicy: TransitionPolicy = {
  id: "POL-PO-001",
  entityType: "purchase_order",
  from: ["linked"],
  to: "active",
  requiresConfirmation: true,
  conditions: [
    {
      code: "HAS_PO_NUMBER",
      description: "Signed PO file URL or client reference PO number must be supplied",
      validate: async (po) => {
        const hasRef = !!po.externalPoNumber || !!po.fileUrl;
        return { ok: hasRef, blocker: !hasRef ? "Must provide external PO reference or upload signed PO file." : undefined };
      }
    }
  ],
  sideEffects: ["TRIGGER_INVOICE_INITIALIZATION"]
};

export const InvoicePaidPolicy: TransitionPolicy = {
  id: "POL-INV-002",
  entityType: "invoice",
  from: ["SENT", "PARTIAL", "OVERDUE"],
  to: "PAID",
  requiresConfirmation: true,
  conditions: [
    {
      code: "ZERO_UNPAID_BALANCE",
      description: "Remaining unpaid balance must be less than or equal to 0.015 base currency units",
      validate: async (inv) => {
        const totalIntended = inv.totalsCache?.totalIntendedBase ? Number(inv.totalsCache.totalIntendedBase) : 0;
        const totalReceived = inv.totalsCache?.totalReceivedBase ? Number(inv.totalsCache.totalReceivedBase) : 0;
        const remaining = Math.max(0, totalIntended - totalReceived);
        return {
          ok: isBalanceSettled(remaining),
          blocker: remaining > 0.015 ? `Unpaid balance remaining: INR ${remaining.toFixed(2)}` : undefined
        };
      }
    }
  ],
  sideEffects: ["CHECK_PROJECT_COMPLETION"]
};

export const ProjectCompletionPolicy: TransitionPolicy = {
  id: "POL-PRJ-003",
  entityType: "project",
  from: ["active", "on_hold"],
  to: "completed",
  requiresConfirmation: true,
  conditions: [
    {
      code: "NO_ACTIVE_INVOICES",
      description: "All project invoices must be fully settled (PAID or CANCELLED)",
      validate: async (prj) => {
        const count = await InvoiceModel.countDocuments({
          projectId: prj._id,
          status: { $in: ["DRAFT", "SENT", "PARTIAL", "OVERDUE"] },
          isDeleted: { $ne: true }
        });
        return {
          ok: count === 0,
          blocker: count > 0 ? `${count} active/unpaid invoice(s) exist under this project.` : undefined
        };
      }
    },
    {
      code: "NO_ACTIVE_PURCHASE_ORDERS",
      description: "All linked procurement and client POs must be completed",
      validate: async (prj) => {
        const count = await PurchaseOrderModel.countDocuments({
          projectId: prj._id,
          status: { $in: ["linked", "active"] }
        });
        return {
          ok: count === 0,
          blocker: count > 0 ? `${count} active/linked PO(s) remain under this project.` : undefined
        };
      }
    }
  ],
  sideEffects: ["LOG_PROJECT_ARCHIVE"]
};

export const QuotationSentPolicy: TransitionPolicy = {
  id: "POL-QTN-002",
  entityType: "quotation",
  from: ["draft"],
  to: "sent",
  requiresConfirmation: false,
  conditions: [],
  sideEffects: []
};

export const QuotationRejectedPolicy: TransitionPolicy = {
  id: "POL-QTN-003",
  entityType: "quotation",
  from: ["draft", "sent"],
  to: "rejected",
  requiresConfirmation: true,
  conditions: [],
  sideEffects: []
};

export const PurchaseOrderCompletedPolicy: TransitionPolicy = {
  id: "POL-PO-002",
  entityType: "purchase_order",
  from: ["active"],
  to: "completed",
  requiresConfirmation: true,
  conditions: [],
  sideEffects: []
};

export const ProjectHoldPolicy: TransitionPolicy = {
  id: "POL-PRJ-001",
  entityType: "project",
  from: ["active"],
  to: "on_hold",
  requiresConfirmation: true,
  conditions: [],
  sideEffects: []
};

export const ProjectResumePolicy: TransitionPolicy = {
  id: "POL-PRJ-002",
  entityType: "project",
  from: ["on_hold"],
  to: "active",
  requiresConfirmation: false,
  conditions: [],
  sideEffects: []
};

export const InvoiceSentPolicy: TransitionPolicy = {
  id: "POL-INV-001",
  entityType: "invoice",
  from: ["DRAFT"],
  to: "SENT",
  requiresConfirmation: false,
  conditions: [
    {
      code: "HAS_TOTAL",
      description: "Invoice must have items and a total greater than 0",
      validate: async (inv) => {
        const total = inv.totals?.total ? Number(inv.totals.total) : 0;
        return { ok: total > 0, blocker: total <= 0 ? "Invoice total must be greater than zero." : undefined };
      }
    }
  ],
  sideEffects: []
};

export const InvoiceCancelledPolicy: TransitionPolicy = {
  id: "POL-INV-003",
  entityType: "invoice",
  from: ["DRAFT", "SENT", "PARTIAL", "OVERDUE"],
  to: "CANCELLED",
  requiresConfirmation: true,
  conditions: [],
  sideEffects: []
};

export const ALL_TRANSITION_POLICIES: Record<string, TransitionPolicy> = {
  "POL-QTN-001": QuotationApprovalPolicy,
  "POL-QTN-002": QuotationSentPolicy,
  "POL-QTN-003": QuotationRejectedPolicy,
  "POL-PO-001": PurchaseOrderActivePolicy,
  "POL-PO-002": PurchaseOrderCompletedPolicy,
  "POL-PRJ-001": ProjectHoldPolicy,
  "POL-PRJ-002": ProjectResumePolicy,
  "POL-INV-001": InvoiceSentPolicy,
  "POL-INV-002": InvoicePaidPolicy,
  "POL-INV-003": InvoiceCancelledPolicy,
  "POL-PRJ-003": ProjectCompletionPolicy
};
