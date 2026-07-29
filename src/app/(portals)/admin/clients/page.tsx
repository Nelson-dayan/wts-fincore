import { Suspense } from "react";
import { AdminClientsClient } from "@/components/portals/admin-clients-client";

export default function AdminClientsPage() {
  return (
    <Suspense fallback={<div className="h-64 flex items-center justify-center">Loading clients...</div>}>
      <AdminClientsClient />
    </Suspense>
  );
}
