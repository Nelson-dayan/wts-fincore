import { AdminInvoiceDetailClient } from "@/components/portals/admin-invoice-detail-client";

interface PageProps {
  params: Promise<{ invoiceId: string }>;
}

export default async function AdminInvoiceDetailPage({ params }: PageProps) {
  const { invoiceId } = await params;
  return <AdminInvoiceDetailClient invoiceId={invoiceId} />;
}
