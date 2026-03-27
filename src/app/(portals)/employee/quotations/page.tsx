import { ResourceTableClient } from "@/components/portals/resource-table-client";

export default function EmployeeQuotationsPage() {
  return (
    <ResourceTableClient
      title="My Quotations"
      description="Quotations created by your account."
      endpoint="/api/employee/quotations"
      columns={[
        { key: "quotationNumber", label: "Quotation #" },
        { key: "status", label: "Status" },
        { key: "projectId", label: "Project" },
        { key: "createdAt", label: "Created At" },
      ]}
    />
  );
}
