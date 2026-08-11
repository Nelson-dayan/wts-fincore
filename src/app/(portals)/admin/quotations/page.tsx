import { Suspense } from "react";
import { connection } from "next/server";
import { AdminQuotationsClient } from "@/components/portals/admin-quotations-client";

interface PageProps {
  searchParams?: Promise<{ projectId?: string }>;
}

async function QuotationsContent({ searchParams }: PageProps) {
  await connection();
  const params = (await searchParams) ?? {};
  const projectId = params.projectId ? String(params.projectId) : "";
  return <AdminQuotationsClient initialProjectId={projectId} />;
}

export default function AdminQuotationsPage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<div className="h-64 flex items-center justify-center text-xs text-muted-foreground">Loading quotations...</div>}>
      <QuotationsContent searchParams={searchParams} />
    </Suspense>
  );
}
