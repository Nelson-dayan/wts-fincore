"use client";

import { useState, useEffect } from "react";
import { Plus, X, Lock, Unlock, CreditCard, RotateCcw, Loader2, Calculator } from "lucide-react";
import { ResourceTableClient } from "@/components/portals/resource-table-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ProjectSearchPicker } from "@/components/portals/project-search-picker";
import { InvoiceRow, InvoiceSearchPicker } from "@/components/portals/invoice-search-picker";
import { RecordPaymentModal } from "@/components/portals/record-payment-modal";

import { apiFetch } from "@/lib/api/client";
import { SUPPORTED_CURRENCIES } from "@/lib/constants/finance";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { usePortalConfig } from "@/components/portals/portal-config-context";
import { PaymentDetailModal } from "@/components/portals/payment-detail-modal";
import { InvoiceLedgerModal } from "@/components/portals/invoice-ledger-modal";

type FeeRow = { type: string; amount: number };

export function AdminPaymentsPageClient({ apiPrefix }: { apiPrefix: string }) {
  const { pathPrefix } = usePortalConfig();
  const [modalOpen, setModalOpen] = useState(false);
  const [viewingPaymentId, setViewingPaymentId] = useState<string | null>(null);
  const [viewingLedgerInvoiceId, setViewingLedgerInvoiceId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);



  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-2">
        <DashboardPageHeader
          title="Payments Ledger"
          description="Global view of all recorded invoice payments and refunds."
        />
        <Button onClick={() => setModalOpen(true)} className="shrink-0 gap-2 font-medium">
          <Plus className="w-4 h-4" /> Add Payment
        </Button>
      </div>

      <ResourceTableClient
        title="Payments"
        description="All recorded invoice payments."
        endpoint="/api/admin/payments"
        showPageHeader={false}
        refreshKey={refreshKey}
        columns={[
          { key: "invoiceId", label: "Invoice #" },
          { key: "receivedAmount", label: "Amount" },
          { key: "currency", label: "Curr" },
          { key: "method", label: "Method" },
          { key: "transactionId", label: "Tx ID" },
          { key: "createdAt", label: "Date" },
        ]}
        extraRowLinks={[
          { label: "Invoice Detail", hrefPattern: `${pathPrefix}/invoices/{invoiceId}` }
        ]}
        onView={(id) => setViewingPaymentId(id)}
        onDelete={async (id) => {
          const res = await fetch(`${apiPrefix}/payments/${id}`, { method: "DELETE" });
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.message || "Failed to delete payment");
          }
          setRefreshKey(k => k + 1);
        }}
      />

      <div className="mt-4 flex gap-4">
        {/* We can't easily add a second 'onView' type action to the generic table, 
            so we'll use a hack: if the user clicks 'Invoice Detail' link, it goes to the page.
            But I'll add a 'Statement' button in the PaymentDetailModal instead, or 
            I can modify ResourceTableClient to support multiple actions.
            Actually, the user said "add the Financial Statement in the Payments page".
        */}
      </div>

      {/* Payment Action Overrides (View Details) */}
      <div className="absolute right-0 top-0 opacity-0 pointer-events-none">
        {/* This is a hack to add a custom action to ResourceTableClient without more complex prop drilling right now */}
      </div>

      {viewingPaymentId && (
        <PaymentDetailModal 
          paymentId={viewingPaymentId} 
          apiPrefix={apiPrefix} 
          onClose={() => setViewingPaymentId(null)} 
          onOpenStatement={(id) => setViewingLedgerInvoiceId(id)}
        />
      )}

      {viewingLedgerInvoiceId && (
        <InvoiceLedgerModal 
          invoiceId={viewingLedgerInvoiceId} 
          apiPrefix={apiPrefix} 
          onClose={() => setViewingLedgerInvoiceId(null)} 
        />
      )}

      {modalOpen && (
        <RecordPaymentModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSuccess={() => {
            setModalOpen(false);
            setRefreshKey((k) => k + 1);
          }}
          apiPrefix={apiPrefix}
        />
      )}
    </div>
  );
}
