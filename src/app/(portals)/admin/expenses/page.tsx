import { CreateRecordForm } from "@/components/portals/create-record-form";
import { ResourceTableClient } from "@/components/portals/resource-table-client";

export default function AdminExpensesPage() {
  return (
    <>
      <CreateRecordForm
        title="Create Expense"
        endpoint="/api/admin/expenses"
        fields={[
          { name: "title", label: "Title", required: true },
          { name: "amount", label: "Amount", type: "number", required: true },
          { name: "category", label: "Category", required: true },
          { name: "projectId", label: "Project ID" },
        ]}
      />
      <ResourceTableClient
        title="Expenses"
        description="Operational and project expenses."
        endpoint="/api/admin/expenses"
        columns={[
          { key: "title", label: "Title" },
          { key: "amount", label: "Amount" },
          { key: "category", label: "Category" },
          { key: "projectId", label: "Project" },
          { key: "createdAt", label: "Created At" },
        ]}
      />
    </>
  );
}
