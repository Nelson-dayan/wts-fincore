import { Suspense } from "react";
import { connection } from "next/server";
import { AdminOverviewClient } from "@/components/portals/admin-overview-client";

async function AdminOverviewContent() {
  await connection();
  return <AdminOverviewClient />;
}

export default function AdminPortalHome() {
  return (
    <Suspense fallback={<div className="h-64 flex items-center justify-center text-xs text-muted-foreground">Loading workspace overview...</div>}>
      <AdminOverviewContent />
    </Suspense>
  );
}
