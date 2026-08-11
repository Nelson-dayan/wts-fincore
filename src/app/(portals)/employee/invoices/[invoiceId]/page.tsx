import { Suspense } from "react";
import { connection } from "next/server";
import { AdminInvoiceDetailClient } from "@/components/portals/admin-invoice-detail-client";

interface PageProps {
  params: Promise<{ invoiceId: string }>;
}

async function EmployeeInvoiceDetailContent({ params }: PageProps) {
  await connection();
  const { invoiceId } = await params;
  return <AdminInvoiceDetailClient invoiceId={invoiceId} />;
}

export default function EmployeeInvoiceDetailPage({ params }: PageProps) {
  return (
    <Suspense fallback={<div className="h-64 flex items-center justify-center text-xs text-muted-foreground">Loading invoice details...</div>}>
      <EmployeeInvoiceDetailContent params={params} />
    </Suspense>
  );
}
