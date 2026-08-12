import { requireSession } from "./require-role";
import { hasPermissionForRole, type ResourceAction } from "./permissions";
import { resolveAuthCompanyContext, type ResolvedAuthContext } from "./company-context";
import { validateResourceHierarchyAlignment } from "./resource-access";

export interface AuthorizeOptions {
  permission: ResourceAction;
  companyId?: string;
  clientId?: string;
  projectId?: string;
  requestedScopeMode?: "single" | "group";
}

export interface AuthorizeResult {
  authorized: boolean;
  session: any;
  context: ResolvedAuthContext;
  reason?: string;
}

export async function authorizeResource(options: AuthorizeOptions): Promise<AuthorizeResult> {
  const session = await requireSession();
  const user = session.user;
  const globalRole = (user.role as "admin" | "employee") || "employee";

  // Step 1: Check Resource Action Permission
  const hasPerm = hasPermissionForRole(globalRole, options.permission);
  if (!hasPerm) {
    return { authorized: false, session, context: null as any, reason: `Permission denied for ${options.permission}` };
  }

  // Step 2: Resolve Company Scoping Context
  const context = await resolveAuthCompanyContext(user, options.companyId, options.requestedScopeMode);

  // Step 3: Check Company Scoping Alignment
  if (options.companyId && !context.allowedCompanyIds.includes(options.companyId)) {
    return { authorized: false, session, context, reason: "Company context access restricted" };
  }

  // Step 4: Validate Hierarchy Alignment (Company -> Client -> Project)
  if (options.companyId || options.clientId || options.projectId) {
    const alignment = await validateResourceHierarchyAlignment({
      companyId: options.companyId || context.activeCompanyId,
      clientId: options.clientId,
      projectId: options.projectId,
    });

    if (!alignment.valid) {
      return { authorized: false, session, context, reason: alignment.error };
    }
  }

  return { authorized: true, session, context };
}
