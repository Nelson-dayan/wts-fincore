import { Suspense } from "react";
import { connection } from "next/server";
import { ResourceTableClient } from "@/components/portals/resource-table-client";

async function ActivityContent() {
  await connection();
  return (
    <ResourceTableClient
      title="Activity Logs"
      description="Recent audit activity across documents and users."
      endpoint="/api/admin/activity"
      columns={[
        { key: "action", label: "Action" },
        { key: "entityType", label: "Entity" },
        { key: "message", label: "Message" },
        { key: "userId", label: "User" },
        { key: "createdAt", label: "Created At" },
      ]}
    />
  );
}

export default function AdminActivityPage() {
  return (
    <Suspense fallback={<div className="h-64 flex items-center justify-center text-xs text-muted-foreground">Loading activity logs...</div>}>
      <ActivityContent />
    </Suspense>
  );
}
