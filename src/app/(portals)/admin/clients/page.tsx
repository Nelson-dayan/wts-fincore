import { Suspense } from "react";
import { connection } from "next/server";
import { AdminClientsClient } from "@/components/portals/admin-clients-client";

async function AdminClientsContent() {
  await connection();
  return <AdminClientsClient />;
}

export default function AdminClientsPage() {
  return (
    <Suspense fallback={<div className="h-64 flex items-center justify-center text-xs text-muted-foreground">Loading clients...</div>}>
      <AdminClientsContent />
    </Suspense>
  );
}
