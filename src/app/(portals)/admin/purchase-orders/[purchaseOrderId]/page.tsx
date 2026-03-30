import { AdminPurchaseOrderDetailsClient } from "@/components/portals/admin-purchase-order-details-client";

interface PageProps {
  params: Promise<{ purchaseOrderId: string }>;
}

export default async function AdminPurchaseOrderDetailPage({ params }: PageProps) {
  const { purchaseOrderId } = await params;
  return <AdminPurchaseOrderDetailsClient purchaseOrderId={purchaseOrderId} />;
}
