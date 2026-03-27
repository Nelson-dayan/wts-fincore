import { ResourceTableClient } from "@/components/portals/resource-table-client";

export default function AdminActivityPage() {
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
