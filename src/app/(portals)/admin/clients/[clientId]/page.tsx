import { Suspense } from "react";
import { connection } from "next/server";
import { AdminClientDetailsClient } from "@/components/portals/admin-client-details-client";

interface PageProps {
  params: Promise<{ clientId: string }>;
}

async function ClientDetailsContent({ params }: PageProps) {
  await connection();
  const { clientId } = await params;
  return <AdminClientDetailsClient clientId={clientId} />;
}

export default function AdminClientDetailsPage({ params }: PageProps) {
  return (
    <Suspense fallback={<div className="h-64 flex items-center justify-center text-xs text-muted-foreground">Loading client details...</div>}>
      <ClientDetailsContent params={params} />
    </Suspense>
  );
}
