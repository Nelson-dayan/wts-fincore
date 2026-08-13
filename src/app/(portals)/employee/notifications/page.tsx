import { Suspense } from "react";
import { connection } from "next/server";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { NotificationBell } from "@/components/portals/notification-bell";
import { ResourceTableClient } from "@/components/portals/resource-table-client";

async function EmployeeNotificationsContent() {
  await connection();
  return (
    <div className="space-y-6">
      <DashboardPageHeader
        eyebrow="Communication"
        title="Notifications & System Alerts"
        description="Stay informed on project status updates, quotation approvals, invoice deadlines, and company broadcasts."
      />
      <ResourceTableClient
        title="Recent Notifications"
        description="All notification broadcasts and security alerts scoped to your role and assigned projects."
        endpoint="/api/admin/notifications"
        columns={[
          { key: "title", label: "Title" },
          { key: "type", label: "Category" },
          { key: "severity", label: "Severity" },
          { key: "createdByName", label: "Sender" },
          { key: "timestamp", label: "Time" },
        ]}
      />
    </div>
  );
}

export default function EmployeeNotificationsPage() {
  return (
    <Suspense
      fallback={
        <div className="h-64 flex items-center justify-center text-xs text-muted-foreground">
          Loading notifications...
        </div>
      }
    >
      <EmployeeNotificationsContent />
    </Suspense>
  );
}
