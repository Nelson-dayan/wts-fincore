import { AdminInvoicesCreateHelper } from "@/components/portals/admin-invoices-create-helper";
import { ResourceTableClient } from "@/components/portals/resource-table-client";

interface PageProps {
  searchParams?: Promise<{ projectId?: string }>;
}

export default async function AdminInvoicesPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const projectId = params.projectId ? String(params.projectId) : "";
  const endpoint = projectId
    ? `/api/admin/invoices?projectId=${encodeURIComponent(projectId)}`
    : "/api/admin/invoices";

  return (
    <>
      <AdminInvoicesCreateHelper projectId={projectId} />
      <ResourceTableClient
      title="Invoices"
      description={
        projectId
          ? "Invoices for this project. Payment status and due dates are shown in each row."
          : "Payment status, totals, due dates, and linked PO. Open a row to edit or print."
      }
      endpoint={endpoint}
      columns={[
        { key: "invoiceNumber", label: "Invoice #" },
        { key: "poNumberRef", label: "PO #" },
        { key: "status", label: "Status" },
        { key: "total", label: "Total" },
        { key: "dueDate", label: "Due Date" },
        { key: "projectId", label: "Project" },
        { key: "createdAt", label: "Created" },
      ]}
      rowDetailPathPrefix="/admin/invoices"
    />
    </>
  );
}
