"use client";

import { PortalConfigProvider } from "@/components/portals/portal-config-context";
import type { ReactNode } from "react";

/** Employee UI routes use `/employee/...` while reusing the same `/api/admin/...` handlers with role checks. */
export function EmployeePortalProviders({ children }: { children: ReactNode }) {
  return (
    <PortalConfigProvider
      value={{ apiPrefix: "/api/admin", pathPrefix: "/employee" }}
    >
      {children}
    </PortalConfigProvider>
  );
}
