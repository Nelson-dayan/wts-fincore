import { ResourceTableClient } from "@/components/portals/resource-table-client";

export default function EmployeeInvoicesPage() {
  return (
    <ResourceTableClient
      title="My Invoices"
      description="Invoices created by you with current payment status."
      endpoint="/api/employee/invoices"
      columns={[
        { key: "invoiceNumber", label: "Invoice #" },
        { key: "status", label: "Status" },
        { key: "dueDate", label: "Due Date" },
        { key: "projectId", label: "Project" },
        { key: "createdAt", label: "Created At" },
      ]}
    />
  );
}
