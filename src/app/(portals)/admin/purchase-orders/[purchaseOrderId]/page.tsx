import { Suspense } from "react";
import { connection } from "next/server";
import { AdminPurchaseOrderDetailsClient } from "@/components/portals/admin-purchase-order-details-client";

interface PageProps {
  params: Promise<{ purchaseOrderId: string }>;
}

async function PurchaseOrderDetailsContent({ params }: PageProps) {
  await connection();
  const { purchaseOrderId } = await params;
  return <AdminPurchaseOrderDetailsClient purchaseOrderId={purchaseOrderId} />;
}

export default function AdminPurchaseOrderDetailPage({ params }: PageProps) {
  return (
    <Suspense fallback={<div className="h-64 flex items-center justify-center text-xs text-muted-foreground">Loading PO details...</div>}>
      <PurchaseOrderDetailsContent params={params} />
    </Suspense>
  );
}
