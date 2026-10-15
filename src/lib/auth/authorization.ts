import mongoose from "mongoose";
import { ProjectModel, ClientModel } from "@/lib/db/models";
import { requireSession } from "./require-role";
import { hasPermissionForRole, type ResourceAction } from "./permissions";
import { resolveAuthCompanyContext, type ResolvedAuthContext } from "./company-context";
import { validateResourceHierarchyAlignment } from "./resource-access";
import { assertEmployeeCanAccessProject } from "./employee-resource-access";

export type AuthorizationFailureCode =
  | "NOT_AUTHENTICATED"
  | "PERMISSION_DENIED"
  | "COMPANY_ACCESS_DENIED"
  | "COMPANY_CONTEXT_SWITCH_REQUIRED"
  | "GROUP_SCOPE_DENIED"
  | "PROJECT_ACCESS_DENIED"
  | "RESOURCE_NOT_FOUND"
  | "RESOURCE_COMPANY_MISMATCH"
  | "RESOURCE_PROJECT_MISMATCH"
  | "RESOURCE_CLIENT_MISMATCH"
  | "INVALID_CONTEXT"
  | "INVALID_WORKFLOW_STATE";

export interface AuthorizeOptions {
  permission: ResourceAction;
  companyId?: string | null;
  clientId?: string | null;
  projectId?: string | Record<string, unknown> | null;
  requestedScopeMode?: "single" | "group";
  workflowTransition?: {
    resourceType: "quotation" | "purchaseOrder" | "invoice" | "expense";
    fromState: string;
    toState: string;
  };
}


export interface AuthorizeResult {
  authorized: boolean;
  code?: AuthorizationFailureCode;
  reason?: string;
  session: any;
  context: ResolvedAuthContext;
}

export function canTransitionWorkflowState(
  resourceType: "quotation" | "purchaseOrder" | "invoice" | "expense",
  fromState: string,
  toState: string,
  userRole: "super_admin" | "admin" | "employee"
): { allowed: boolean; requiredPermission?: ResourceAction; reason?: string } {
  const from = fromState.toUpperCase();
  const to = toState.toUpperCase();

  if (resourceType === "quotation") {
    // Quotation Lifecycle: DRAFT -> SENT -> APPROVED / DECLINED
    if (from === "APPROVED") {
      return { allowed: false, reason: "Cannot edit or transition an already APPROVED quotation." };
    }
    if (to === "SENT") {
      return { allowed: true, requiredPermission: "quotations.send" };
    }
    if (to === "APPROVED") {
      return { allowed: true, requiredPermission: "quotations.approve" };
    }
  }

  if (resourceType === "invoice") {
    // Invoice Lifecycle (Option A): DRAFT -> ISSUED -> SENT -> PAID / VOID
    if (from === "PAID" || from === "VOID" || from === "CANCELLED") {
      return { allowed: false, reason: "Cannot modify a PAID, VOID, or CANCELLED invoice." };
    }
    if (to === "ISSUED") {
      return { allowed: true, requiredPermission: "invoices.issue" };
    }
    if (to === "SENT") {
      return { allowed: true, requiredPermission: "invoices.send" };
    }
    if (to === "PAID") {
      return { allowed: true, requiredPermission: "invoices.markPaid" };
    }
    if (to === "VOID" || to === "CANCELLED") {
      return { allowed: true, requiredPermission: "invoices.void" };
    }
  }

  if (resourceType === "purchaseOrder") {
    // Purchase Order Lifecycle: DRAFT -> ISSUED / SENT -> APPROVED -> CANCELLED
    if (from === "APPROVED" && to !== "APPROVED") {
      return { allowed: false, reason: "Cannot modify an APPROVED purchase order." };
    }
    if (to === "APPROVED") {
      return { allowed: true, requiredPermission: "purchaseOrders.approve" };
    }
  }

  if (resourceType === "expense") {
    // Expense Lifecycle: SUBMITTED -> APPROVED / REJECTED
    if (from === "APPROVED" || from === "REJECTED") {
      return { allowed: false, reason: "Cannot modify an APPROVED or REJECTED expense." };
    }
    if (to === "APPROVED") {
      return { allowed: true, requiredPermission: "expenses.approve" };
    }
    if (to === "REJECTED") {
      return { allowed: true, requiredPermission: "expenses.reject" };
    }
  }

  return { allowed: true };
}

export async function authorizeResource(options: AuthorizeOptions): Promise<AuthorizeResult> {
  let session: any;
  try {
    session = await requireSession();
  } catch (err) {
    return {
      authorized: false,
      code: "NOT_AUTHENTICATED",
      reason: "User session is invalid or missing.",
      session: null,
      context: null as any,
    };
  }

  const user = session.user;
  const globalRole = (user.role as "super_admin" | "admin" | "employee") || "employee";

  // Step 1: Capability Permission Check
  const hasPerm = hasPermissionForRole(globalRole, options.permission);
  if (!hasPerm) {
    return {
      authorized: false,
      code: "PERMISSION_DENIED",
      reason: `Action permission '${options.permission}' denied for role '${globalRole}'.`,
      session,
      context: null as any,
    };
  }

  // Sanitize projectId & clientId
  let cleanProjectId: string | undefined = undefined;
  if (options.projectId) {
    if (typeof options.projectId === "object" && options.projectId !== null && "_id" in (options.projectId as any)) {
      cleanProjectId = String((options.projectId as any)._id);
    } else {
      cleanProjectId = String(options.projectId).trim();
    }
    if (!cleanProjectId || cleanProjectId === "[object Object]" || cleanProjectId === "undefined" || cleanProjectId === "null") {
      cleanProjectId = undefined;
    }
  }

  let cleanClientId: string | undefined = undefined;
  if (options.clientId) {
    if (typeof options.clientId === "object" && options.clientId !== null && "_id" in (options.clientId as any)) {
      cleanClientId = String((options.clientId as any)._id);
    } else {
      cleanClientId = String(options.clientId).trim();
    }
    if (!cleanClientId || cleanClientId === "[object Object]" || cleanClientId === "undefined" || cleanClientId === "null") {
      cleanClientId = undefined;
    }
  }

  // Resolve effective resource companyId if omitted
  let resolvedCompanyId = options.companyId ? String(options.companyId).trim() : undefined;
  if (resolvedCompanyId === "[object Object]" || resolvedCompanyId === "undefined" || resolvedCompanyId === "null") {
    resolvedCompanyId = undefined;
  }

  if (!resolvedCompanyId && cleanProjectId && mongoose.Types.ObjectId.isValid(cleanProjectId)) {
    const proj = await ProjectModel.findById(cleanProjectId).select("companyId clientId").lean();
    if (proj && proj.companyId) {
      resolvedCompanyId = String(proj.companyId);
    }
  } else if (!resolvedCompanyId && cleanClientId && mongoose.Types.ObjectId.isValid(cleanClientId)) {
    const cli = await ClientModel.findById(cleanClientId).select("companyId").lean();
    if (cli && cli.companyId) {
      resolvedCompanyId = String(cli.companyId);
    }
  }

  // Step 2: Active Context & Scope Resolution
  const context = await resolveAuthCompanyContext(user, resolvedCompanyId, options.requestedScopeMode);

  if (options.requestedScopeMode === "group" && !context.canAccessGroupView) {
    return {
      authorized: false,
      code: "GROUP_SCOPE_DENIED",
      reason: "Group View scope requires groupView.access permission.",
      session,
      context,
    };
  }

  // Step 3: Company Ownership & Legal Scope Check
  if (context.isRequestedCompanyUnauthorized && resolvedCompanyId && !context.userAssignedCompanyIds?.includes(resolvedCompanyId)) {
    return {
      authorized: false,
      code: "COMPANY_ACCESS_DENIED",
      reason: `Company '${resolvedCompanyId}' is outside your authorized company scope.`,
      session,
      context,
    };
  }

  if (resolvedCompanyId && !context.allowedCompanyIds.includes(resolvedCompanyId)) {
    const isMemberOfTargetCompany = context.userAssignedCompanyIds?.includes(resolvedCompanyId);
    if (isMemberOfTargetCompany) {
      return {
        authorized: false,
        code: "COMPANY_CONTEXT_SWITCH_REQUIRED",
        reason: `Target document belongs to company '${resolvedCompanyId}'. Context switch with authentication required to access.`,
        session,
        context,
      };
    }

    return {
      authorized: false,
      code: "COMPANY_ACCESS_DENIED",
      reason: `Company '${resolvedCompanyId}' is outside your authorized company scope.`,
      session,
      context,
    };
  }


  // Step 4: Validate Data Hierarchy Alignment (Company -> Client -> Project)
  if (resolvedCompanyId || cleanClientId || cleanProjectId) {
    const alignment = await validateResourceHierarchyAlignment({
      companyId: resolvedCompanyId || context.activeCompanyId,
      clientId: cleanClientId,
      projectId: cleanProjectId,
      explicitCompanyId: options.companyId ? String(options.companyId).trim() : null,
    });

    if (!alignment.valid) {
      const code: AuthorizationFailureCode = alignment.error?.includes("COMPANY_MISMATCH")
        ? "RESOURCE_COMPANY_MISMATCH"
        : alignment.error?.includes("CLIENT_MISMATCH")
        ? "RESOURCE_CLIENT_MISMATCH"
        : "RESOURCE_PROJECT_MISMATCH";

      return {
        authorized: false,
        code,
        reason: alignment.error,
        session,
        context,
      };
    }
  }

  // Step 4.5: Employee Project Scope Check
  if (globalRole === "employee" && cleanProjectId) {
    try {
      await assertEmployeeCanAccessProject(session.user.id, cleanProjectId);
    } catch {
      return {
        authorized: false,
        code: "PROJECT_ACCESS_DENIED",
        reason: `Employee does not have access to project '${cleanProjectId}'.`,
        session,
        context,
      };
    }
  }

  // Step 5: Workflow Transition Check (if provided)
  if (options.workflowTransition) {
    const transition = canTransitionWorkflowState(
      options.workflowTransition.resourceType,
      options.workflowTransition.fromState,
      options.workflowTransition.toState,
      globalRole
    );

    if (!transition.allowed) {
      return {
        authorized: false,
        code: "INVALID_WORKFLOW_STATE",
        reason: transition.reason || "Invalid workflow transition",
        session,
        context,
      };
    }

    if (transition.requiredPermission && !hasPermissionForRole(globalRole, transition.requiredPermission)) {
      return {
        authorized: false,
        code: "PERMISSION_DENIED",
        reason: `Workflow transition requires '${transition.requiredPermission}' permission.`,
        session,
        context,
      };
    }
  }

  return {
    authorized: true,
    session,
    context,
  };
}
