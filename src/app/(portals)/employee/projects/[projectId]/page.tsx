import { Suspense } from "react";
import { connection } from "next/server";
import { AdminProjectDetailsClient } from "@/components/portals/admin-project-details-client";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

async function EmployeeProjectDetailContent({ params }: PageProps) {
  await connection();
  const { projectId } = await params;
  return <AdminProjectDetailsClient projectId={projectId} allowProjectMutations={false} />;
}

export default function EmployeeProjectDetailPage({ params }: PageProps) {
  return (
    <Suspense fallback={<div className="h-64 flex items-center justify-center text-xs text-muted-foreground">Loading project details...</div>}>
      <EmployeeProjectDetailContent params={params} />
    </Suspense>
  );
}
