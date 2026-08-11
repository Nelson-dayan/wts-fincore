import { Suspense } from "react";
import { connection } from "next/server";
import { AdminInvoicesCreateHelper } from "@/components/portals/admin-invoices-create-helper";
import { AdminInvoicesPageClient } from "@/components/portals/admin-invoice-detail/admin-invoices-page-client";

interface PageProps {
  searchParams?: Promise<{ projectId?: string }>;
}

async function InvoicesContent({ searchParams }: { searchParams: Promise<{ projectId?: string }> }) {
  await connection();
  const params = await searchParams;
  const projectId = params.projectId ? String(params.projectId) : "";
  const endpoint = projectId
    ? `/api/admin/invoices?projectId=${encodeURIComponent(projectId)}`
    : "/api/admin/invoices";

  return (
    <>
      <AdminInvoicesCreateHelper projectId={projectId} />
      <AdminInvoicesPageClient
        projectId={projectId}
        endpoint={endpoint}
      />
    </>
  );
}

export default function AdminInvoicesPage({ searchParams }: PageProps) {
  const paramsPromise = searchParams ?? Promise.resolve({});

  return (
    <Suspense fallback={<div className="h-64 flex items-center justify-center">Loading invoices...</div>}>
      <InvoicesContent searchParams={paramsPromise} />
    </Suspense>
  );
}
