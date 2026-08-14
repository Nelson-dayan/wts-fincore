import { CompanyHierarchyService, type CompanyContextResult } from "@/lib/services/business/company-hierarchy.service";
import { hasPermissionForRole, type ResourceAction } from "./permissions";
import { getUserAccessInfo } from "./user-company-access";

export interface ResolvedAuthContext {
  userId: string;
  globalRole: "super_admin" | "admin" | "employee";
  scopeMode: "single" | "group";
  canAccessGroupView: boolean;
  canManageGroup: boolean;
  allowedCompanyIds: string[];
  activeCompanyId: string;
  userAssignedCompanyIds: string[];
  isRequestedCompanyUnauthorized?: boolean;
}

export async function resolveAuthCompanyContext(
  sessionUser: { id: string; role: string; customPermissions?: ResourceAction[] },
  requestedCompanyId?: string | null,
  requestedScopeMode?: "single" | "group" | null
): Promise<ResolvedAuthContext> {
  const globalRole = (sessionUser.role as "super_admin" | "admin" | "employee") || "employee";
  
  const canAccessGroupView = hasPermissionForRole(globalRole, "groupView.access", sessionUser.customPermissions);
  const canManageGroup = hasPermissionForRole(globalRole, "companyHierarchy.manage", sessionUser.customPermissions);

  const userAccess = await getUserAccessInfo(sessionUser.id, globalRole);

  let isRequestedCompanyUnauthorized = false;
  // Validate target company request against user's assigned companies
  let targetCompanyId = requestedCompanyId || userAccess.defaultCompanyId;
  if (requestedCompanyId && !userAccess.isSuperAdmin && !userAccess.assignedCompanyIds.includes(requestedCompanyId)) {
    isRequestedCompanyUnauthorized = true;
    targetCompanyId = userAccess.defaultCompanyId || userAccess.assignedCompanyIds[0] || null;
  }

  // Hard Rule: Context does not grant permissions. Group scope is only enabled if user possesses groupView.access permission.
  const effectiveScopeMode = canAccessGroupView && requestedScopeMode === "group" ? "group" : "single";

  const context: CompanyContextResult = await CompanyHierarchyService.resolveCompanyContext(
    targetCompanyId || null,
    effectiveScopeMode
  );

  let finalAllowedIds = context.allowedCompanyIds.map((id) => id.toString());

  // Filter allowed IDs by user's assigned companies if not Super Admin
  if (!userAccess.isSuperAdmin) {
    finalAllowedIds = finalAllowedIds.filter((id) => userAccess.assignedCompanyIds.includes(id));
    if (finalAllowedIds.length === 0) {
      finalAllowedIds = userAccess.assignedCompanyIds;
    }
  }

  return {
    userId: sessionUser.id,
    globalRole,
    scopeMode: effectiveScopeMode,
    canAccessGroupView,
    canManageGroup,
    allowedCompanyIds: finalAllowedIds,
    activeCompanyId: context.companyId.toString(),
    userAssignedCompanyIds: userAccess.assignedCompanyIds,
    isRequestedCompanyUnauthorized,
  };
}

