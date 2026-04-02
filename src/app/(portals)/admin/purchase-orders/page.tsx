import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { AdminPurchaseOrdersPageClient } from "@/components/portals/admin-purchase-orders-page-client";

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
    <>
      <DashboardPageHeader title="Purchase orders" description="Add PO below. List underneath." />
      <AdminPurchaseOrdersPageClient projectId={projectId} endpoint={endpoint} />
    </>
  );
}
