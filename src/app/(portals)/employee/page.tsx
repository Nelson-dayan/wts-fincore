import { Suspense } from "react";
import { connection } from "next/server";
import { EmployeeOverviewClient } from "@/components/portals/employee-overview-client";

async function EmployeeOverviewContent() {
  await connection();
  return <EmployeeOverviewClient />;
}

export default function EmployeePortalHome() {
  return (
    <Suspense fallback={<div className="h-64 flex items-center justify-center text-xs text-muted-foreground">Loading portal overview...</div>}>
      <EmployeeOverviewContent />
    </Suspense>
  );
}
