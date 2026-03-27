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
    <ResourceTableClient
      title="Invoices"
      description={
        projectId
          ? "Invoice list filtered by selected project."
          : "Invoice list with payment statuses and due dates."
      }
      endpoint={endpoint}
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
