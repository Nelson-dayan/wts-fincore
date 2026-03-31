import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { AdminPurchaseOrdersReceivePoClient } from "@/components/portals/admin-purchase-orders-receive-po-client";
import { ResourceTableClient } from "@/components/portals/resource-table-client";

interface PageProps {
  searchParams?: Promise<{ projectId?: string }>;
}

export default async function AdminPurchaseOrdersPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const projectId = params.projectId ? String(params.projectId) : "";
  const endpoint = projectId
    ? `/api/admin/purchase-orders?projectId=${encodeURIComponent(projectId)}`
    : "/api/admin/purchase-orders";

  return (
    <>
      <DashboardPageHeader title="Purchase orders" description="Add PO below. List underneath." />
      <AdminPurchaseOrdersReceivePoClient projectId={projectId} />
    <ResourceTableClient
      title="Purchase Orders"
      showPageHeader={false}
      description=""
      endpoint={endpoint}
      extraRowLinks={[{ label: "Invoice", hrefPattern: "/admin/invoices/new?poId={id}" }]}
      columns={[
        { key: "poNumber", label: "PO #" },
        { key: "quotationNumber", label: "Quotation" },
        { key: "type", label: "Type" },
        { key: "status", label: "Status" },
        { key: "invoiceCount", label: "Invoices" },
        { key: "hasFile", label: "Document" },
        { key: "createdAt", label: "Created" },
      ]}
      rowDetailPathPrefix="/admin/purchase-orders"
      rowDetailHash="#po-invoices"
      emptyMessage="No purchase orders yet."
    />
    </>
  );
}
