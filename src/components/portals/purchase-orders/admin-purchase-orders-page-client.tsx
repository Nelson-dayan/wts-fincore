"use client";

import { useState } from "react";
import { AdminPurchaseOrdersReceivePoClient } from "@/components/portals/admin-purchase-orders-receive-po-client";
import { ResourceTableClient } from "@/components/portals/resource-table-client";
import { usePortalConfig } from "@/components/portals/portal-config-context";

export function AdminPurchaseOrdersPageClient({
  projectId,
  endpoint,
}: {
  projectId: string;
  endpoint: string;
}) {
  const { pathPrefix } = usePortalConfig();
  const [poListRefreshKey, setPoListRefreshKey] = useState(0);

  return (
    <>
      <AdminPurchaseOrdersReceivePoClient
        projectId={projectId}
        onPoSaved={() => setPoListRefreshKey((k) => k + 1)}
      />
      <ResourceTableClient
        title="Purchase Orders"
        showPageHeader={false}
        description=""
        endpoint={endpoint}
        refreshKey={poListRefreshKey}
        extraRowLinks={[
          { label: "Invoice", hrefPattern: `${pathPrefix}/invoices/new?poId={id}` },
        ]}
        columns={[
          { key: "poNumber", label: "PO #" },
          { key: "quotationNumber", label: "Quotation" },
          { key: "type", label: "Type" },
          { key: "status", label: "Status" },
          { key: "invoiceCount", label: "Invoices" },
          { key: "hasFile", label: "Document" },
          { key: "createdAt", label: "Created" },
        ]}
        rowDetailPathPrefix={`${pathPrefix}/purchase-orders`}
        rowDetailHash="#po-invoices"
        emptyMessage="No purchase orders yet."
      />
    </>
  );
}
