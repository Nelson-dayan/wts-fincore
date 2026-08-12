import { CompanyHierarchyService, type CompanyContextResult } from "@/lib/services/business/company-hierarchy.service";
import { hasPermissionForRole, type ResourceAction } from "./permissions";

export interface ResolvedAuthContext {
  userId: string;
  globalRole: "admin" | "employee";
  scopeMode: "single" | "group";
  canAccessGroupView: boolean;
  canManageGroup: boolean;
  allowedCompanyIds: string[];
  activeCompanyId: string;
}

export async function resolveAuthCompanyContext(
  sessionUser: { id: string; role: string; customPermissions?: ResourceAction[] },
  requestedCompanyId?: string | null,
  requestedScopeMode?: "single" | "group" | null
): Promise<ResolvedAuthContext> {
  const globalRole = (sessionUser.role as "admin" | "employee") || "employee";
  
  const canAccessGroupView = hasPermissionForRole(globalRole, "groupView.access", sessionUser.customPermissions);
  const canManageGroup = hasPermissionForRole(globalRole, "companyHierarchy.manage", sessionUser.customPermissions);

  // Hard Rule: Context does not grant permissions. Group scope is only enabled if user possesses groupView.access permission.
  const effectiveScopeMode = canAccessGroupView && requestedScopeMode === "group" ? "group" : "single";

  const context: CompanyContextResult = await CompanyHierarchyService.resolveCompanyContext(
    requestedCompanyId || null,
    effectiveScopeMode
  );

  return {
    userId: sessionUser.id,
    globalRole,
    scopeMode: effectiveScopeMode,
    canAccessGroupView,
    canManageGroup,
    allowedCompanyIds: context.allowedCompanyIds.map((id) => id.toString()),
    activeCompanyId: context.companyId.toString(),
  };
}
