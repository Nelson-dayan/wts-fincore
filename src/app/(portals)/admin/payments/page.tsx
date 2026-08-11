import { Suspense } from "react";
import { connection } from "next/server";
import { AdminPaymentsPageClient } from "@/components/portals/admin-payments-page-client";

async function PaymentsContent() {
  await connection();
  return <AdminPaymentsPageClient apiPrefix="/api/admin" />;
}

export default function AdminPaymentsPage() {
  return (
    <Suspense fallback={<div className="h-64 flex items-center justify-center text-xs text-muted-foreground">Loading payments...</div>}>
      <PaymentsContent />
    </Suspense>
  );
}
