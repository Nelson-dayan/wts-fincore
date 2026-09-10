import { Suspense } from "react";
import { connection } from "next/server";
import { AdminUsersClient } from "@/components/portals/admin-users-client";

async function AdminUsersContent() {
  await connection();
  return <AdminUsersClient />;
}

export default function AdminUsersPlaceholder() {
  return (
    <Suspense fallback={<div className="h-64 flex items-center justify-center text-xs text-muted-foreground">Loading users...</div>}>
      <AdminUsersContent />
    </Suspense>
  );
}
