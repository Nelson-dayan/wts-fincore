import { InvoiceModel, PurchaseOrderModel, ProjectModel } from "@/lib/db/models";
import { isBalanceSettled } from "@/lib/services/finance/money";

export enum TransitionSideEffect {
  TRIGGER_PO_INITIALIZATION = "TRIGGER_PO_INITIALIZATION",
  TRIGGER_INVOICE_INITIALIZATION = "TRIGGER_INVOICE_INITIALIZATION",
  CHECK_PROJECT_COMPLETION = "CHECK_PROJECT_COMPLETION",
  LOG_PROJECT_ARCHIVE = "LOG_PROJECT_ARCHIVE"
}

export enum TransitionCategory {
  FINANCIAL = "FINANCIAL",
  OPERATIONAL = "OPERATIONAL",
  COMPLIANCE = "COMPLIANCE",
  SYSTEM = "SYSTEM",
  RISK = "RISK"
}

export interface PolicyMetadata {
  category: TransitionCategory;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  requiresApproval: boolean;
  reversible: boolean;
  impactsLedger: boolean;
  impactsReporting: boolean;
}

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
  sideEffects: TransitionSideEffect[];
  metadata: PolicyMetadata;
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
  sideEffects: [TransitionSideEffect.TRIGGER_PO_INITIALIZATION],
  metadata: {
    category: TransitionCategory.OPERATIONAL,
    riskLevel: "LOW",
    requiresApproval: true,
    reversible: true,
    impactsLedger: false,
    impactsReporting: true
  }
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
  sideEffects: [TransitionSideEffect.TRIGGER_INVOICE_INITIALIZATION],
  metadata: {
    category: TransitionCategory.OPERATIONAL,
    riskLevel: "MEDIUM",
    requiresApproval: true,
    reversible: false,
    impactsLedger: false,
    impactsReporting: true
  }
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
  sideEffects: [TransitionSideEffect.CHECK_PROJECT_COMPLETION],
  metadata: {
    category: TransitionCategory.FINANCIAL,
    riskLevel: "HIGH",
    requiresApproval: true,
    reversible: false,
    impactsLedger: true,
    impactsReporting: true
  }
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
  sideEffects: [TransitionSideEffect.LOG_PROJECT_ARCHIVE],
  metadata: {
    category: TransitionCategory.COMPLIANCE,
    riskLevel: "HIGH",
    requiresApproval: true,
    reversible: false,
    impactsLedger: false,
    impactsReporting: true
  }
};

export const QuotationSentPolicy: TransitionPolicy = {
  id: "POL-QTN-002",
  entityType: "quotation",
  from: ["draft"],
  to: "sent",
  requiresConfirmation: false,
  conditions: [],
  sideEffects: [],
  metadata: {
    category: TransitionCategory.OPERATIONAL,
    riskLevel: "LOW",
    requiresApproval: false,
    reversible: true,
    impactsLedger: false,
    impactsReporting: false
  }
};

export const QuotationRejectedPolicy: TransitionPolicy = {
  id: "POL-QTN-003",
  entityType: "quotation",
  from: ["draft", "sent"],
  to: "rejected",
  requiresConfirmation: true,
  conditions: [],
  sideEffects: [],
  metadata: {
    category: TransitionCategory.OPERATIONAL,
    riskLevel: "LOW",
    requiresApproval: true,
    reversible: true,
    impactsLedger: false,
    impactsReporting: false
  }
};

export const PurchaseOrderCompletedPolicy: TransitionPolicy = {
  id: "POL-PO-002",
  entityType: "purchase_order",
  from: ["active"],
  to: "completed",
  requiresConfirmation: true,
  conditions: [],
  sideEffects: [],
  metadata: {
    category: TransitionCategory.OPERATIONAL,
    riskLevel: "MEDIUM",
    requiresApproval: true,
    reversible: false,
    impactsLedger: false,
    impactsReporting: true
  }
};

export const ProjectHoldPolicy: TransitionPolicy = {
  id: "POL-PRJ-001",
  entityType: "project",
  from: ["active"],
  to: "on_hold",
  requiresConfirmation: true,
  conditions: [],
  sideEffects: [],
  metadata: {
    category: TransitionCategory.RISK,
    riskLevel: "MEDIUM",
    requiresApproval: true,
    reversible: true,
    impactsLedger: false,
    impactsReporting: true
  }
};

export const ProjectResumePolicy: TransitionPolicy = {
  id: "POL-PRJ-002",
  entityType: "project",
  from: ["on_hold"],
  to: "active",
  requiresConfirmation: false,
  conditions: [],
  sideEffects: [],
  metadata: {
    category: TransitionCategory.OPERATIONAL,
    riskLevel: "LOW",
    requiresApproval: false,
    reversible: true,
    impactsLedger: false,
    impactsReporting: true
  }
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
  sideEffects: [],
  metadata: {
    category: TransitionCategory.COMPLIANCE,
    riskLevel: "MEDIUM",
    requiresApproval: false,
    reversible: true,
    impactsLedger: false,
    impactsReporting: true
  }
};

export const InvoiceCancelledPolicy: TransitionPolicy = {
  id: "POL-INV-003",
  entityType: "invoice",
  from: ["DRAFT", "SENT", "PARTIAL", "OVERDUE"],
  to: "CANCELLED",
  requiresConfirmation: true,
  conditions: [],
  sideEffects: [],
  metadata: {
    category: TransitionCategory.FINANCIAL,
    riskLevel: "CRITICAL",
    requiresApproval: true,
    reversible: false,
    impactsLedger: true,
    impactsReporting: true
  }
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

/**
 * -------------------------------------------------------------
 * Semantic Introspection APIs (Policy Registry & Discovery)
 * -------------------------------------------------------------
 */

export function getPoliciesByCategory(category: TransitionCategory): TransitionPolicy[] {
  return Object.values(ALL_TRANSITION_POLICIES).filter(p => p.metadata.category === category);
}

export function getCriticalPolicies(): TransitionPolicy[] {
  return Object.values(ALL_TRANSITION_POLICIES).filter(p => p.metadata.riskLevel === "CRITICAL" || p.metadata.riskLevel === "HIGH");
}

export function getFinancialPolicies(): TransitionPolicy[] {
  return Object.values(ALL_TRANSITION_POLICIES).filter(p => p.metadata.category === TransitionCategory.FINANCIAL || p.metadata.impactsLedger);
}

export function getPoliciesByEntityType(entityType: TransitionPolicy["entityType"]): TransitionPolicy[] {
  return Object.values(ALL_TRANSITION_POLICIES).filter(p => p.entityType === entityType);
}

export interface PolicyManifest {
  policies: Array<{
    id: string;
    entityType: string;
    from: string[];
    to: string;
    requiresConfirmation: boolean;
    sideEffects: TransitionSideEffect[];
    metadata: PolicyMetadata;
    conditions: string[];
  }>;
  categories: string[];
  riskMatrix: Record<string, string[]>;
  sideEffects: string[];
  contractVersion: string;
}

export function exportPolicyManifest(): PolicyManifest {
  const policies = Object.values(ALL_TRANSITION_POLICIES).map(p => ({
    id: p.id,
    entityType: p.entityType,
    from: p.from,
    to: p.to,
    requiresConfirmation: p.requiresConfirmation,
    sideEffects: p.sideEffects,
    metadata: p.metadata,
    conditions: p.conditions.map(c => c.description)
  }));

  const categories = Object.values(TransitionCategory);
  const sideEffects = Object.values(TransitionSideEffect);

  const riskMatrix: Record<string, string[]> = {
    LOW: [],
    MEDIUM: [],
    HIGH: [],
    CRITICAL: []
  };

  for (const p of Object.values(ALL_TRANSITION_POLICIES)) {
    riskMatrix[p.metadata.riskLevel].push(p.id);
  }

  return {
    policies,
    categories,
    riskMatrix,
    sideEffects,
    contractVersion: "v1"
  };
}
