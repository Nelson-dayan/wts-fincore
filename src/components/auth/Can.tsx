"use client";

import React from "react";
import { ResourceAction } from "@/lib/auth/permissions";
import { useCan } from "@/lib/auth/use-can";

interface CanProps {
  action: ResourceAction;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Declarative component for gating UI elements based on capability authorization.
 * Usage:
 * <Can action="quotations.approve">
 *   <Button onClick={approve}>Approve Quotation</Button>
 * </Can>
 */
export function Can({ action, children, fallback = null }: CanProps) {
  const { can } = useCan();

  if (can(action)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}
