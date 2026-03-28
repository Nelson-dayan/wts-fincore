import { AdminQuotationsClient } from "@/components/portals/admin-quotations-client";

interface PageProps {
  searchParams?: Promise<{ projectId?: string; create?: string }>;
}

export default async function AdminQuotationsPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const projectId = params.projectId ? String(params.projectId) : "";
  const defaultCreateExpanded =
    params.create === "1" || params.create === "true" || params.create === "yes";

  return (
    <AdminQuotationsClient
      initialProjectId={projectId}
      defaultCreateExpanded={defaultCreateExpanded}
    />
  );
}
