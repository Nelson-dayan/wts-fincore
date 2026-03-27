import { CreateProjectForm } from "@/components/portals/create-project-form";
import { AdminProjectsClient } from "@/components/portals/admin-projects-client";

interface PageProps {
  searchParams?: Promise<{ clientId?: string }>;
}

export default async function AdminProjectsPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const clientId = params.clientId ? String(params.clientId) : "";

  return (
    <>
      <CreateProjectForm />
      <AdminProjectsClient initialClientId={clientId} />
    </>
  );
}
