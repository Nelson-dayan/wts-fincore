import { Suspense } from "react";
import { connection } from "next/server";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { AdminPurchaseOrdersPageClient } from "@/components/portals/admin-purchase-orders-page-client";

interface PageProps {
  searchParams?: Promise<{ projectId?: string }>;
}

async function PurchaseOrdersContent({ searchParams }: { searchParams: Promise<{ projectId?: string }> }) {
  await connection();
  const params = await searchParams;
  const projectId = params.projectId ? String(params.projectId) : "";
  const endpoint = projectId
    ? `/api/admin/purchase-orders?projectId=${encodeURIComponent(projectId)}`
    : "/api/admin/purchase-orders";

  return <AdminPurchaseOrdersPageClient projectId={projectId} endpoint={endpoint} />;
}

export default function AdminPurchaseOrdersPage({ searchParams }: PageProps) {
  const paramsPromise = searchParams ?? Promise.resolve({});

  return (
    <>
      <DashboardPageHeader title="Purchase orders" description="Add PO below. List underneath." />
      <Suspense fallback={<div className="h-64 flex items-center justify-center">Loading POs...</div>}>
        <PurchaseOrdersContent searchParams={paramsPromise} />
      </Suspense>
    </>
  );
}
