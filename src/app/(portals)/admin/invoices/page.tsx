import { AdminInvoicesCreateHelper } from "@/components/portals/admin-invoices-create-helper";
import { AdminInvoicesPageClient } from "@/components/portals/admin-invoice-detail/admin-invoices-page-client";

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
      <AdminInvoicesPageClient
        projectId={projectId}
        endpoint={endpoint}
      />
    </>
  );
}
