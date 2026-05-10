import { AdminQuotationDetailsClient } from "@/components/portals/admin-quotation-details-client";

interface PageProps {
  params: Promise<{ quotationId: string }>;
}

export default async function EmployeeQuotationDetailPage({ params }: PageProps) {
  const { quotationId } = await params;
  return <AdminQuotationDetailsClient quotationId={quotationId} />;
}
