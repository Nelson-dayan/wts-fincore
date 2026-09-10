"use client";

import { useState } from "react";
import { ResourceTableClient } from "@/components/portals/resource-table-client";
import { apiFetch } from "@/lib/api/client";

export function AdminExpensesPageClient({
  endpoint,
}: {
  endpoint: string;
}) {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleDelete = async (id: string) => {
    await apiFetch(`/api/admin/expenses/${id}`, {
      method: "DELETE",
    });
    setRefreshKey((k) => k + 1);
  };

  return (
    <ResourceTableClient
      title="Expenses"
      description="Operational and project expenses."
      endpoint={endpoint}
      refreshKey={refreshKey}
      onDelete={handleDelete}
      columns={[
        { key: "title", label: "Title" },
        { key: "amount", label: "Amount" },
        { key: "category", label: "Category" },
        { key: "projectName", label: "Project" },
        { key: "createdAt", label: "Created At" },
      ]}
    />
  );
}
