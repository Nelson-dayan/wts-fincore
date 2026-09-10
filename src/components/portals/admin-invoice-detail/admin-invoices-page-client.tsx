"use client";

import { useState } from "react";
import { ResourceTableClient } from "@/components/portals/resource-table-client";
import { apiFetch } from "@/lib/api/client";

export function AdminInvoicesPageClient({
  projectId,
  endpoint,
}: {
  projectId: string;
  endpoint: string;
}) {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleDelete = async (id: string) => {
    await apiFetch(`/api/admin/invoices/${id}`, {
      method: "DELETE",
    });
    setRefreshKey((k) => k + 1);
  };

  return (
    <ResourceTableClient
      title="Invoices"
      description={
        projectId
          ? "Invoices for this project. Payment status and due dates are shown in each row."
          : "Payment status, totals, due dates, and linked PO. Open a row to edit or print."
      }
      endpoint={endpoint}
      refreshKey={refreshKey}
      onDelete={handleDelete}
      columns={[
        { key: "invoiceNumber", label: "Invoice #" },
        { key: "poNumberRef", label: "PO #" },
        { key: "status", label: "Status" },
        { key: "total", label: "Total" },
        { key: "dueDate", label: "Due Date" },
        { key: "projectId", label: "Project" },
        { key: "createdAt", label: "Created" },
      ]}
      rowDetailPathPrefix="/admin/invoices"
    />
  );
}
