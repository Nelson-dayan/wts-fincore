"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

export type PortalConfig = {
  /** API collection prefix, e.g. `/api/admin` or `/api/employee` */
  apiPrefix: string;
  /** App path prefix for links, e.g. `/admin` or `/employee` */
  pathPrefix: string;
};

const defaultConfig: PortalConfig = {
  apiPrefix: "/api/admin",
  pathPrefix: "/admin",
};

const PortalConfigContext = createContext<PortalConfig>(defaultConfig);

export function PortalConfigProvider({
  value,
  children,
}: {
  value: PortalConfig;
  children: ReactNode;
}) {
  const merged = useMemo(
    () => ({ apiPrefix: value.apiPrefix, pathPrefix: value.pathPrefix }),
    [value.apiPrefix, value.pathPrefix]
  );
  return (
    <PortalConfigContext.Provider value={merged}>{children}</PortalConfigContext.Provider>
  );
}

export function usePortalConfig(): PortalConfig {
  return useContext(PortalConfigContext);
}
