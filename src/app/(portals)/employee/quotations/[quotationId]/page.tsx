import { Suspense } from "react";
import { connection } from "next/server";
import { AdminQuotationDetailsClient } from "@/components/portals/admin-quotation-details-client";

interface PageProps {
  params: Promise<{ quotationId: string }>;
}

async function EmployeeQuotationDetailContent({ params }: PageProps) {
  await connection();
  const { quotationId } = await params;
  return <AdminQuotationDetailsClient quotationId={quotationId} />;
}

export default function EmployeeQuotationDetailPage({ params }: PageProps) {
  return (
    <Suspense fallback={<div className="h-64 flex items-center justify-center text-xs text-muted-foreground">Loading quotation details...</div>}>
      <EmployeeQuotationDetailContent params={params} />
    </Suspense>
  );
}
