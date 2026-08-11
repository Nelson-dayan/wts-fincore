import { Suspense } from "react";
import { connection } from "next/server";
import { AdminProjectDetailsClient } from "@/components/portals/admin-project-details-client";

interface ProjectDetailsPageProps {
  params: Promise<{ projectId: string }>;
}

async function ProjectDetailsContent({ params }: ProjectDetailsPageProps) {
  await connection();
  const { projectId } = await params;
  return <AdminProjectDetailsClient projectId={projectId} />;
}

export default function ProjectDetailsPage({ params }: ProjectDetailsPageProps) {
  return (
    <Suspense fallback={<div className="h-64 flex items-center justify-center text-xs text-muted-foreground">Loading project details...</div>}>
      <ProjectDetailsContent params={params} />
    </Suspense>
  );
}
