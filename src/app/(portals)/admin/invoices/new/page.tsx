import { Suspense } from "react";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { NewInvoiceClient } from "./new-invoice-client";

export default function AdminNewInvoicePage() {
  return (
    <div className="animate-fade-in">
      <DashboardPageHeader
        title="New invoice"
        description="Linked to the selected purchase order. Creating the draft…"
      />
      <Suspense fallback={<p className="text-muted-foreground text-sm">Loading…</p>}>
        <NewInvoiceClient />
      </Suspense>
    </div>
  );
}
