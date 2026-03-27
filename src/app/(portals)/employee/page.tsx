import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { StatPlaceholder } from "@/components/dashboard/stat-placeholder";
import { Bell, FileText } from "lucide-react";

export default function EmployeePortalHome() {
  return (
    <div className="animate-[fade-in_0.4s_ease-out_both]">
      <DashboardPageHeader
        title="Your workspace"
        description="A calm home for daily work — assignments, files, and updates in one streamlined view."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <StatPlaceholder
          icon={FileText}
          title="My assignments"
          description="Track tasks and deadlines. Connect your task backend to populate this area."
        />
        <StatPlaceholder
          icon={Bell}
          title="Profile & notifications"
          description="Tune alerts and profile details so you stay in the loop without noise."
        />
      </div>
    </div>
  );
}
