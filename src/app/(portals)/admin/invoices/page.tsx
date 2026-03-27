import { ResourceTableClient } from "@/components/portals/resource-table-client";

export default function AdminInvoicesPage() {
  return (
    <ResourceTableClient
      title="Invoices"
      description="Invoice list with payment statuses and due dates."
      endpoint="/api/admin/invoices"
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
