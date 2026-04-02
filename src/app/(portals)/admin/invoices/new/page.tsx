import { AdminInvoiceDetailClient } from "@/components/portals/admin-invoice-detail-client";

interface PageProps {
  searchParams?: Promise<{ poId?: string }>;
}

export default async function AdminNewInvoicePage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const poId = String(params.poId ?? "").trim();
  return (
    <div className="animate-fade-in">
      <AdminInvoiceDetailClient poId={poId} />
    </div>
  );
}
