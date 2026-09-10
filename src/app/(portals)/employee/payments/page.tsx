import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResourceTableClient } from "@/components/portals/resource-table-client";

interface PageProps {
  searchParams?: Promise<{ invoiceId?: string }>;
}

export default async function EmployeePaymentsPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const invoiceId = params.invoiceId ? String(params.invoiceId).trim() : "";
  const endpoint = invoiceId
    ? `/api/admin/payments?invoiceId=${encodeURIComponent(invoiceId)}`
    : "";

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
          <div>
            <h3 className="font-medium text-blue-900 dark:text-blue-400">Strict Reconciliation Enforcement</h3>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              Payments can only be viewed from a selected invoice to keep project-level reconciliation accurate.
            </p>
          </div>
        </div>
        <Link href="/employee/invoices">
          <Button size="sm" className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white">
            Go to Invoices
          </Button>
        </Link>
      </div>

      {invoiceId ? (
        <ResourceTableClient
          title="Payments"
          description="Payments for the selected invoice."
          endpoint={endpoint}
          columns={[
            { key: "invoiceId", label: "Invoice" },
            { key: "amount", label: "Amount" },
            { key: "method", label: "Method" },
            { key: "transactionId", label: "Transaction ID" },
            { key: "createdAt", label: "Created At" },
          ]}
        />
      ) : null}
    </div>
  );
}
