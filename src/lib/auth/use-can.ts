"use client";

import { useSession } from "next-auth/react";
import { ResourceAction, hasPermissionForRole } from "./permissions";

/**
 * Custom React hook to evaluate capability permissions on the client side.
 * Standardizes UI gating so controls match server capability enforcement.
 */
export function useCan() {
  const { data: session } = useSession();

  const can = (action: ResourceAction): boolean => {
    if (!session?.user) return false;

    const role = (session.user as { role?: string }).role || "employee";
    const customPermissions = (session.user as { permissions?: ResourceAction[] }).permissions;

    return hasPermissionForRole(role, action, customPermissions);
  };

  const userRole = (session?.user as { role?: string })?.role || "employee";
  const isAdmin = userRole === "admin";

  return { can, role: userRole, isAdmin, user: session?.user };
}
