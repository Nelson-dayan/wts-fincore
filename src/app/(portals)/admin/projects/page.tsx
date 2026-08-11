import { Suspense } from "react";
import { connection } from "next/server";
import { CreateProjectForm } from "@/components/portals/create-project-form";
import { AdminProjectsClient } from "@/components/portals/admin-projects-client";

interface PageProps {
  searchParams?: Promise<{ clientId?: string }>;
}

async function ProjectsContent({ searchParams }: { searchParams: Promise<{ clientId?: string }> }) {
  await connection();
  const params = await searchParams;
  const clientId = params.clientId ? String(params.clientId) : "";
  return <AdminProjectsClient initialClientId={clientId} />;
}

export default function AdminProjectsPage({ searchParams }: PageProps) {
  const paramsPromise = searchParams ?? Promise.resolve({});

  return (
    <>
      <Suspense fallback={<div className="h-64 flex items-center justify-center">Loading projects...</div>}>
        <ProjectsContent searchParams={paramsPromise} />
      </Suspense>
      <CreateProjectForm />
    </>
  );
}
