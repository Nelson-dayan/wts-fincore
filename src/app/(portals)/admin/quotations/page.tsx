import { ResourceTableClient } from "@/components/portals/resource-table-client";

export default function AdminQuotationsPage() {
  return (
    <ResourceTableClient
      title="Quotations"
      description="Quotation documents used for client proposals."
      endpoint="/api/admin/quotations"
      columns={[
        { key: "quotationNumber", label: "Quotation #" },
        { key: "status", label: "Status" },
        { key: "projectId", label: "Project" },
        { key: "createdAt", label: "Created At" },
      ]}
    />
  );
}
