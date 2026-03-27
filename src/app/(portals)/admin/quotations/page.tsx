import { ResourceTableClient } from "@/components/portals/resource-table-client";

interface PageProps {
  searchParams?: Promise<{ projectId?: string }>;
}

export default async function AdminQuotationsPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const projectId = params.projectId ? String(params.projectId) : "";
  const endpoint = projectId
    ? `/api/admin/quotations?projectId=${encodeURIComponent(projectId)}`
    : "/api/admin/quotations";

  return (
    <ResourceTableClient
      title="Quotations"
      description={
        projectId
          ? "Quotation documents filtered by selected project."
          : "Quotation documents used for client proposals."
      }
      endpoint={endpoint}
      columns={[
        { key: "quotationNumber", label: "Quotation #" },
        { key: "status", label: "Status" },
        { key: "projectId", label: "Project" },
        { key: "createdAt", label: "Created At" },
      ]}
    />
  );
}
