import { ResourceTableClient } from "@/components/portals/resource-table-client";

interface PageProps {
  searchParams?: Promise<{ projectId?: string }>;
}

export default async function AdminPurchaseOrdersPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const projectId = params.projectId ? String(params.projectId) : "";
  const endpoint = projectId
    ? `/api/admin/purchase-orders?projectId=${encodeURIComponent(projectId)}`
    : "/api/admin/purchase-orders";

  return (
    <ResourceTableClient
      title="Purchase Orders"
      description={
        projectId
          ? "Client and internal purchase orders filtered by selected project."
          : "Client and internal purchase orders linked to quotations."
      }
      endpoint={endpoint}
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
