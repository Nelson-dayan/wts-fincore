import { Suspense } from "react";
import { connection } from "next/server";
import { AdminAccountsClient } from "@/components/portals/admin-accounts-client";

async function AccountsContent() {
  await connection();
  return <AdminAccountsClient apiPrefix="/api/admin" />;
}

export default function AdminAccountsPage() {
  return (
    <Suspense fallback={<div className="h-64 flex items-center justify-center text-xs text-muted-foreground">Loading accounts...</div>}>
      <AccountsContent />
    </Suspense>
  );
}
