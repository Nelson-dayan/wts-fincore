import { Suspense } from "react";
import { AdminQuotationDetailsClient } from "@/components/portals/admin-quotation-details-client";

interface PageProps {
  params: Promise<{ quotationId: string }>;
}

async function QuotationDetailsContent({ params }: PageProps) {
  const { quotationId } = await params;
  return <AdminQuotationDetailsClient quotationId={quotationId} />;
}

export default function AdminQuotationDetailPage({ params }: PageProps) {
  return (
    <Suspense fallback={<div className="h-64 flex items-center justify-center">Loading quotation details...</div>}>
      <QuotationDetailsContent params={params} />
    </Suspense>
  );
}
