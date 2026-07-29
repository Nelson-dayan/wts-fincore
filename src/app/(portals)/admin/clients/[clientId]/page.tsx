import { Suspense } from "react";
import { AdminClientDetailsClient } from "@/components/portals/admin-client-details-client";

interface PageProps {
  params: Promise<{ clientId: string }>;
}

async function ClientDetailsContent({ params }: PageProps) {
  const { clientId } = await params;
  return <AdminClientDetailsClient clientId={clientId} />;
}

export default function AdminClientDetailsPage({ params }: PageProps) {
  return (
    <Suspense fallback={<div className="h-64 flex items-center justify-center">Loading client details...</div>}>
      <ClientDetailsContent params={params} />
    </Suspense>
  );
}
