import { Suspense } from "react";
import { connection } from "next/server";
import { CreateRecordForm } from "@/components/portals/create-record-form";
import { ResourceTableClient } from "@/components/portals/resource-table-client";
import { AdminExpensesCreateHelper } from "@/components/portals/admin-expenses-create-helper";

interface PageProps {
  searchParams?: Promise<{ projectId?: string }>;
}

async function ExpensesContent({ searchParams }: { searchParams: Promise<{ projectId?: string }> }) {
  await connection();
  const params = await searchParams;
  const projectId = params.projectId ? String(params.projectId) : "";
  const endpoint = projectId
    ? `/api/admin/expenses?projectId=${encodeURIComponent(projectId)}`
    : "/api/admin/expenses";

  return (
    <>
      <AdminExpensesCreateHelper projectId={projectId} />
      <CreateRecordForm
        title="Create Expense"
        endpoint="/api/admin/expenses"
        fields={[
          { name: "title", label: "Title", required: true },
          { name: "amount", label: "Amount", type: "number", required: true },
          {
            name: "category",
            label: "Category",
            type: "select",
            options: [
              { value: "SALARY", label: "Salary" },
              { value: "TOOLS", label: "Tools" },
              { value: "ADS", label: "Ads" },
              { value: "INFRA", label: "Infra" },
              { value: "OTHER", label: "Other" },
            ],
            required: true,
          },
          { name: "note", label: "Note (Optional)" },
          { name: "projectId", label: "Project", type: "projectSearch" },
        ]}
        initialValues={projectId ? { projectId } : {}}
      />
      <ResourceTableClient
        title="Expenses"
        description="Expenses on your assigned projects."
        endpoint={endpoint}
        columns={[
          { key: "title", label: "Title" },
          { key: "amount", label: "Amount" },
          { key: "category", label: "Category" },
          { key: "projectName", label: "Project" },
          { key: "createdAt", label: "Created At" },
        ]}
      />
    </>
  );
}

export default function EmployeeExpensesPage({ searchParams }: PageProps) {
  const paramsPromise = searchParams ?? Promise.resolve({});

  return (
    <Suspense fallback={<div className="h-64 flex items-center justify-center">Loading expenses...</div>}>
      <ExpensesContent searchParams={paramsPromise} />
    </Suspense>
  );
}
