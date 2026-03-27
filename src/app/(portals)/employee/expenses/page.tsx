import { ResourceTableClient } from "@/components/portals/resource-table-client";

export default function EmployeeExpensesPage() {
  return (
    <ResourceTableClient
      title="My Expenses"
      description="Expenses created by you."
      endpoint="/api/employee/expenses"
      columns={[
        { key: "title", label: "Title" },
        { key: "amount", label: "Amount" },
        { key: "category", label: "Category" },
        { key: "projectId", label: "Project" },
        { key: "createdAt", label: "Created At" },
      ]}
    />
  );
}
