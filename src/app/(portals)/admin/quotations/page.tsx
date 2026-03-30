import { AdminQuotationsClient } from "@/components/portals/admin-quotations-client";

interface PageProps {
  searchParams?: Promise<{ projectId?: string }>;
}

export default async function AdminQuotationsPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const projectId = params.projectId ? String(params.projectId) : "";

  return <AdminQuotationsClient initialProjectId={projectId} />;
}
