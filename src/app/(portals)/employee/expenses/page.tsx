export const unstable_instant = { prefetch: 'static', unstable_disableValidation: true };

import { Suspense } from "react";
import { CreateRecordForm } from "@/components/portals/create-record-form";
import { ResourceTableClient } from "@/components/portals/resource-table-client";
import { AdminExpensesCreateHelper } from "@/components/portals/admin-expenses-create-helper";

interface PageProps {
  searchParams?: Promise<{ projectId?: string }>;
}

async function ExpensesContent({ searchParams }: { searchParams: Promise<{ projectId?: string }> }) {
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
          { name: "category", label: "Category", required: true },
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
