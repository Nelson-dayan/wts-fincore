import { AdminClientDetailsClient } from "@/components/portals/admin-client-details-client";

interface PageProps {
  params: Promise<{ clientId: string }>;
}

export default async function AdminClientDetailsPage({ params }: PageProps) {
  const { clientId } = await params;
  return <AdminClientDetailsClient clientId={clientId} />;
}
