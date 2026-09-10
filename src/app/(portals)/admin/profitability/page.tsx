import { Suspense } from "react";
import { connection } from "next/server";
import { AdminProfitabilityClient } from "@/components/portals/admin-profitability-client";

async function ProfitabilityContent() {
  await connection();
  return <AdminProfitabilityClient />;
}

export default function ProfitabilityPage() {
  return (
    <Suspense fallback={<div className="h-64 flex items-center justify-center text-xs text-muted-foreground">Loading profitability analytics...</div>}>
      <ProfitabilityContent />
    </Suspense>
  );
}
