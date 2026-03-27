import { ResourceTableClient } from "@/components/portals/resource-table-client";

export default function AdminPurchaseOrdersPage() {
  return (
    <ResourceTableClient
      title="Purchase Orders"
      description="Client and internal purchase orders linked to quotations."
      endpoint="/api/admin/purchase-orders"
      columns={[
        { key: "poNumber", label: "PO #" },
        { key: "type", label: "Type" },
        { key: "status", label: "Status" },
        { key: "fileUrl", label: "File URL" },
        { key: "createdAt", label: "Created At" },
      ]}
    />
  );
}
