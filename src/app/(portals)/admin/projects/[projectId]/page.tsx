import { AdminProjectDetailsClient } from "@/components/portals/admin-project-details-client";

interface ProjectDetailsPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectDetailsPage({ params }: ProjectDetailsPageProps) {
  const { projectId } = await params;
  return <AdminProjectDetailsClient projectId={projectId} />;
}
