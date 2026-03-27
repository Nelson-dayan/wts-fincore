import { ResourceTableClient } from "@/components/portals/resource-table-client";

export default function AdminPaymentsPage() {
  return (
    <ResourceTableClient
      title="Payments"
      description="All recorded invoice payments."
      endpoint="/api/admin/payments"
      columns={[
        { key: "invoiceId", label: "Invoice" },
        { key: "amount", label: "Amount" },
        { key: "method", label: "Method" },
        { key: "transactionId", label: "Transaction ID" },
        { key: "createdAt", label: "Created At" },
      ]}
    />
  );
}
