import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { UserRoundSearch } from "lucide-react";

export default function AdminUsersPlaceholder() {
  return (
    <div className="animate-[fade-in_0.4s_ease-out_both]">
      <DashboardPageHeader
        title="Users"
        description="Search, filter, and manage accounts. Wire this view to your user API when ready."
      />
      <div className="flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-dashed border-border/90 bg-muted/15 px-6 py-12 text-center">
        <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
          <UserRoundSearch className="size-7" strokeWidth={1.5} aria-hidden />
        </div>
        <p className="text-sm font-medium text-foreground">No user table yet</p>
        <p className="mt-2 max-w-sm text-xs leading-relaxed text-muted-foreground">
          This is a production-ready empty state: add a data table, invite flow,
          or export actions in this panel.
        </p>
      </div>
    </div>
  );
}
