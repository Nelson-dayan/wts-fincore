import { AdminProjectDetailsClient } from "@/components/portals/admin-project-details-client";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function EmployeeProjectDetailPage({ params }: PageProps) {
  const { projectId } = await params;
  return <AdminProjectDetailsClient projectId={projectId} allowProjectMutations={false} />;
}
