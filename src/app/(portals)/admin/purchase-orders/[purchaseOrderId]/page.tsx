import { Suspense } from "react";
import { AdminPurchaseOrderDetailsClient } from "@/components/portals/admin-purchase-order-details-client";

interface PageProps {
  params: Promise<{ purchaseOrderId: string }>;
}

async function PurchaseOrderDetailsContent({ params }: PageProps) {
  const { purchaseOrderId } = await params;
  return <AdminPurchaseOrderDetailsClient purchaseOrderId={purchaseOrderId} />;
}

export default function AdminPurchaseOrderDetailPage({ params }: PageProps) {
  return (
    <Suspense fallback={<div className="h-64 flex items-center justify-center">Loading PO details...</div>}>
      <PurchaseOrderDetailsContent params={params} />
    </Suspense>
  );
}
