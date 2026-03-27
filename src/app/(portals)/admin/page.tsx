import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { StatPlaceholder } from "@/components/dashboard/stat-placeholder";
import { ClipboardList, Users } from "lucide-react";

export default function AdminPortalHome() {
  return (
    <div className="animate-[fade-in_0.4s_ease-out_both]">
      <DashboardPageHeader
        title="Dashboard"
        description="Manage people, permissions, and workspace settings from one place. Modules below are ready for your next features."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatPlaceholder
          icon={Users}
          title="Users & roles"
          description="Invite teammates, assign admin or employee roles, and control who sees what."
        />
        <StatPlaceholder
          icon={ClipboardList}
          title="System settings"
          description="Configure integrations, security policies, and org-wide preferences."
        />
        <div className="flex flex-col justify-center rounded-2xl border border-dashed border-border/90 bg-muted/20 px-5 py-8 text-center sm:col-span-2 lg:col-span-1">
          <p className="text-sm font-medium text-muted-foreground">
            Empty state
          </p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground/80">
            Add widgets, charts, or activity feeds here when you connect data.
          </p>
        </div>
      </div>
    </div>
  );
}
