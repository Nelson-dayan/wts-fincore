"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { Plus, CreditCard, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { decimalToNumber } from "@/lib/services/business/money";
import { apiFetch } from "@/lib/api/client";
import { usePortalConfig } from "@/components/portals/portal-config-context";
import { RecordPaymentModal } from "@/components/portals/record-payment-modal";

interface PaymentRow {
  _id: string;
  type: "PAYMENT" | "REFUND";
  method: string;
  currency: string;
  amount: number;
  amountBase: number;
  status: string;
  createdAt: string;
}

export function PaymentsCard({ 
  invoiceId, 
  companyId,
  invoiceCurrency = "AED",
  invoiceExchangeRate = 1,
  invoiceTotalAmount = 0,
  invoiceTotalsCache,
  fixCurrency = false
}: { 
  invoiceId: string;
  companyId: string;
  invoiceCurrency?: string;
  invoiceExchangeRate?: number;
  invoiceTotalAmount?: number;
  invoiceTotalsCache?: {
    totalReceivedBase: number;
    totalFeesBase: number;
    totalIntendedBase: number;
    overpaidAmountBase: number;
  };
  fixCurrency?: boolean;
}) {
  const { apiPrefix } = usePortalConfig();
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const limit = 10;

  const loadPayments = useCallback(async (currentPage: number) => {
    if (!invoiceId) return;
    setLoading(true);
    try {
      const data = await apiFetch<{ items?: PaymentRow[]; hasMore?: boolean }>(
        `${apiPrefix}/payments?invoiceId=${invoiceId}&page=${currentPage}&limit=${limit}`
      );
      setPayments(data.items || []);
      setHasMore(data.hasMore ?? false);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [apiPrefix, invoiceId, limit]);

  useEffect(() => {
    loadPayments(page);
  }, [loadPayments, page]);

  const invoiceBaseTotal = invoiceTotalAmount * invoiceExchangeRate;
  
  const totalIntended = invoiceTotalsCache?.totalIntendedBase ?? 0;
  const totalReceived = invoiceTotalsCache?.totalReceivedBase ?? 0;
  const totalFees = invoiceTotalsCache?.totalFeesBase ?? 0;

  const remainingIntended = Math.max(0, invoiceBaseTotal - totalIntended);
  const remainingActual = Math.max(0, invoiceBaseTotal - totalReceived);
  const overpaid = invoiceTotalsCache?.overpaidAmountBase ?? 0;

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm relative animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-brand" />
            Financial Ledger
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Payments allocated to this invoice.</p>
        </div>
        
        <Button size="sm" className="hover-lift bg-brand hover:bg-brand/90" onClick={() => setModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Record Payment
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-muted/20 border col-span-2">
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Invoice Total (Base)</p>
          <p className="text-2xl font-bold tabular-nums">₹{invoiceBaseTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-muted-foreground mt-1 font-medium opacity-70">({invoiceCurrency} {invoiceTotalAmount.toLocaleString()})</p>
        </div>
        <div className="p-4 rounded-xl bg-muted/20 border">
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Remaining</p>
          <p className="text-xl font-bold tabular-nums">₹{remainingActual.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
          <p className="text-[10px] text-primary uppercase font-bold tracking-widest mb-1">Collected</p>
          <p className="text-xl font-bold text-primary tabular-nums">₹{totalReceived.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      <div className="border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground border-b">
              <tr>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[10px]">Date</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[10px]">Method</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[10px]">Account</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[10px] text-right">Amount</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[10px] text-right">Base (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading && payments.length === 0 ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-4"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-4 w-24 ml-auto" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-4 w-28 ml-auto" /></td>
                  </tr>
                ))
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-muted-foreground italic">No transactions recorded for this invoice.</td>
                </tr>
              ) : (
                payments.map(p => {
                  const isRefund = p.type === "REFUND";
                  return (
                    <tr key={p._id} className={isRefund ? "bg-red-500/5" : "hover:bg-muted/5 transition-colors"}>
                      <td className="px-4 py-4 font-medium text-xs whitespace-nowrap">
                        {format(new Date(p.createdAt), "dd MMM yyyy")}
                      </td>
                      <td className="px-4 py-4 text-xs font-medium capitalize">{p.method.replace('_', ' ')}</td>
                      <td className="px-4 py-4 text-xs text-muted-foreground">{(p as any).accountId?.name || "-"}</td>
                      <td className="px-4 py-4 text-right whitespace-nowrap font-semibold">
                         {p.currency} {decimalToNumber(p.amount ?? (p as any).receivedAmount).toLocaleString()}
                      </td>
                      <td className="px-4 py-4 text-right whitespace-nowrap">
                        <div className={`font-bold tabular-nums ${isRefund ? "text-red-600" : "text-green-600"}`}>
                          {isRefund ? "-" : "+"}₹{decimalToNumber(p.amountBase ?? (p as any).receivedAmountBase).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <RecordPaymentModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => loadPayments(page)}
        apiPrefix={apiPrefix}
        initialProjectId={(payments[0] as any)?.projectId || ""}
        initialInvoiceId={invoiceId}
      />
    </div>
  );
}
