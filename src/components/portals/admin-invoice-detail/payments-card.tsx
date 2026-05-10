"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { Plus, CreditCard, RotateCcw, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { decimalToNumber } from "@/lib/services/business/money";
import { readResponseJson } from "@/lib/http/read-response-json";
import { usePortalConfig } from "@/components/portals/portal-config-context";

interface PaymentRow {
  _id: string;
  type: "PAYMENT" | "REFUND";
  method: string;
  currency: string;
  exchangeRate: number;
  intendedAmount: number;
  receivedAmount: number;
  intendedAmountBase: number;
  receivedAmountBase: number;
  fees: { amount: number; currency: string }[];
  status: string;
  createdAt: string;
}

type ApiMessage = { message?: string };
type SelectChangeEvent = React.ChangeEvent<HTMLSelectElement>;

export function PaymentsCard({ 
  invoiceId, 
  companyId,
  invoiceCurrency = "AED",
  invoiceExchangeRate = 1,
  invoiceTotalAmount = 0,
  invoiceTotalsCache
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
}) {
  const { apiPrefix } = usePortalConfig();
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const limit = 10;

  // Form State
  const [type, setType] = useState<"PAYMENT" | "REFUND">("PAYMENT");
  const [method, setMethod] = useState("BANK_TRANSFER");
  const [currency, setCurrency] = useState(invoiceCurrency);
  const [exchangeRate, setExchangeRate] = useState(invoiceExchangeRate);
  const [intendedAmount, setIntendedAmount] = useState(0);
  const [receivedAmount, setReceivedAmount] = useState(0);
  const [feeAmount, setFeeAmount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const loadPayments = useCallback(async (currentPage: number) => {
    if (!invoiceId) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiPrefix}/payments?invoiceId=${invoiceId}&page=${currentPage}&limit=${limit}`);
      const data = await res.json();
      if (res.ok) {
        setPayments(data.items || []);
        setHasMore(data.hasMore);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [apiPrefix, invoiceId, limit]);

  useEffect(() => {
    if (!invoiceId) {
      setPayments([]);
      setLoading(false);
      return;
    }
    void loadPayments(page);
  }, [invoiceId, loadPayments, page]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    if (feeAmount > intendedAmount && type === "PAYMENT") {
      setError("Fees cannot exceed intended amount.");
      setSubmitting(false);
      return;
    }

    try {
      const payload = {
        invoiceId,
        companyId,
        type,
        method,
        currency,
        exchangeRate: Number(exchangeRate),
        intendedAmount: Number(intendedAmount),
        receivedAmount: Number(receivedAmount),
        fees: feeAmount > 0 ? [{ type: "GATEWAY_FEE", amount: Number(feeAmount), currency }] : []
      };

      const res = await fetch(`${apiPrefix}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await readResponseJson(res);
      
      if (!res.ok) {
        throw new Error(
          (typeof data === "object" && data !== null ? (data as ApiMessage).message : undefined) ||
            "Failed to record payment"
        );
      }
      
      setDrawerOpen(false);
      // Reload current page or go back to page 1 to see the new record.
      setPage(1);
      if (page === 1) {
        loadPayments(1);
      }
      
      // Reset form
      setIntendedAmount(0);
      setReceivedAmount(0);
      setFeeAmount(0);
      setType("PAYMENT");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to record payment");
    } finally {
      setSubmitting(false);
    }
  };

  const invoiceBaseTotal = invoiceTotalAmount * invoiceExchangeRate;
  
  // Use exact cache from backend if available, otherwise fallback to local calculation
  const totalIntended = invoiceTotalsCache?.totalIntendedBase ?? payments.reduce((acc, p) => {
    const mult = p.type === "REFUND" ? -1 : 1;
    return acc + (p.intendedAmountBase || 0) * mult;
  }, 0);

  const totalReceived = invoiceTotalsCache?.totalReceivedBase ?? payments.reduce((acc, p) => {
    const mult = p.type === "REFUND" ? -1 : 1;
    return acc + (p.receivedAmountBase || 0) * mult;
  }, 0);

  const totalFees = invoiceTotalsCache?.totalFeesBase ?? payments.reduce((acc, p) => {
    return acc + p.fees.reduce((sum, f) => sum + (f.amount * p.exchangeRate), 0);
  }, 0);

  const remainingIntended = Math.max(0, invoiceBaseTotal - totalIntended);
  const remainingActual = Math.max(0, invoiceBaseTotal - totalReceived);
  const overpaid = invoiceTotalsCache?.overpaidAmountBase ?? Math.max(0, totalReceived - invoiceBaseTotal);

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm relative">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-brand" />
            Financial Ledger
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Manage payments, refunds, and base currency conversions.</p>
        </div>
        
        <Button size="sm" className="hover-lift" onClick={() => setDrawerOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Record Payment
        </Button>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity p-4 sm:p-6">
          <div className="w-full max-w-xl bg-background rounded-2xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 border border-border/50 overflow-hidden max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b bg-muted/20">
              <div>
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Plus className="w-5 h-5 text-brand" />
                  Record Transaction
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Backend calculations will use the exchange rate provided.</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setDrawerOpen(false)} className="rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors">
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              <form id="payment-form" onSubmit={handleSubmit} className="space-y-6">
                {error && <div className="text-sm font-medium text-destructive bg-destructive/10 p-3 rounded-lg border border-destructive/20">{error}</div>}

                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-2.5">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</Label>
                    <Select 
                      value={type} 
                      onChange={(e: SelectChangeEvent) => setType(e.target.value as "PAYMENT" | "REFUND")}
                      options={[
                        {value: "PAYMENT", label: "Payment"},
                        {value: "REFUND", label: "Refund"}
                      ]}
                    />
                  </div>
                  <div className="space-y-2.5">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Method</Label>
                    <Select 
                      value={method} 
                      onChange={(e: SelectChangeEvent) => setMethod(e.target.value)}
                      options={[
                        {value: "BANK_TRANSFER", label: "Bank Transfer"},
                        {value: "STRIPE", label: "Stripe"},
                        {value: "WISE", label: "Wise"},
                        {value: "PAYPAL", label: "PayPal"},
                        {value: "UPI", label: "UPI"},
                        {value: "CASH", label: "Cash"}
                      ]}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-2.5">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Currency</Label>
                    <Input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={3} className="font-mono uppercase" />
                  </div>
                  <div className="space-y-2.5">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Exchange Rate (to INR)</Label>
                    <Input type="number" step="0.0001" min="0" required value={exchangeRate} onChange={(e) => setExchangeRate(Number(e.target.value))} className="font-mono" />
                  </div>
                </div>

                <div className="space-y-5 p-5 border rounded-xl bg-primary/5 border-primary/10">
                  <div className="space-y-2">
                    <Label className="font-medium text-foreground">{type === "REFUND" ? "Refund Amount" : "Intended Amount (Client Paid)"}</Label>
                    <div className="flex items-center relative">
                      <span className="absolute left-3 text-sm font-semibold text-muted-foreground">{currency}</span>
                      <Input type="number" step="0.01" min="0" required value={intendedAmount || ""} onChange={(e) => setIntendedAmount(Number(e.target.value))} className="pl-12 font-mono text-base" placeholder="0.00" />
                    </div>
                    {intendedAmount > 0 && <p className="text-xs font-medium text-muted-foreground text-right">≈ ₹{(intendedAmount * exchangeRate).toLocaleString(undefined, { maximumFractionDigits: 2 })} Base</p>}
                  </div>

                  <div className="space-y-2">
                    <Label className="font-medium text-foreground">{type === "REFUND" ? "Refund Handed Over" : "Received Amount (Hit Bank)"}</Label>
                    <div className="flex items-center relative">
                      <span className="absolute left-3 text-sm font-semibold text-muted-foreground">{currency}</span>
                      <Input type="number" step="0.01" min="0" required value={receivedAmount || ""} onChange={(e) => setReceivedAmount(Number(e.target.value))} className="pl-12 font-mono text-base" placeholder="0.00" />
                    </div>
                    {receivedAmount > 0 && <p className="text-xs font-medium text-muted-foreground text-right">≈ ₹{(receivedAmount * exchangeRate).toLocaleString(undefined, { maximumFractionDigits: 2 })} Base</p>}
                  </div>

                  {type === "PAYMENT" && (
                    <div className="space-y-2 pt-3 border-t border-primary/10">
                      <Label className="font-medium text-foreground">Deducted Fees (Optional)</Label>
                      <div className="flex items-center relative">
                        <span className="absolute left-3 text-sm font-semibold text-muted-foreground">{currency}</span>
                        <Input type="number" step="0.01" min="0" value={feeAmount || ""} onChange={(e) => setFeeAmount(Number(e.target.value))} className="pl-12 font-mono text-base" placeholder="0.00" />
                      </div>
                      {feeAmount > 0 && <p className="text-xs font-medium text-red-500/80 text-right">≈ ₹{(feeAmount * exchangeRate).toLocaleString(undefined, { maximumFractionDigits: 2 })} Base Lost</p>}
                    </div>
                  )}
                </div>
              </form>
            </div>
            
            <div className="p-5 border-t bg-muted/10 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setDrawerOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" form="payment-form" disabled={submitting} className="min-w-[140px] shadow-md hover:shadow-lg transition-all">
                {submitting ? "Processing..." : `Confirm ${type}`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Financial Ledger Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-lg bg-muted/30 border col-span-2">
          <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-1">Invoice Total (Base)</p>
          <p className="text-2xl font-bold">₹{invoiceBaseTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
          <p className="text-xs text-muted-foreground mt-1">({invoiceCurrency} {invoiceTotalAmount.toLocaleString()})</p>
        </div>
        <div className="p-4 rounded-lg bg-muted/30 border">
          <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-1">Remaining Intended</p>
          <p className="text-xl font-bold">₹{remainingIntended.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
        </div>
        <div className="p-4 rounded-lg bg-muted/30 border">
          <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-1">Remaining Actual</p>
          <p className="text-xl font-bold">₹{remainingActual.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
        </div>
        
        <div className="p-4 rounded-lg bg-brand/5 border border-brand/10">
          <p className="text-xs text-brand-accent uppercase font-semibold tracking-wider mb-1">Total Intended</p>
          <p className="text-lg font-bold text-brand">₹{totalIntended.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
        </div>
        <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/10 dark:bg-green-500/10">
          <p className="text-xs text-green-600 dark:text-green-400 uppercase font-semibold tracking-wider mb-1">Total Received</p>
          <p className="text-lg font-bold text-green-700 dark:text-green-300">₹{totalReceived.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
        </div>
        <div className="p-4 rounded-lg bg-red-500/5 border border-red-500/10 dark:bg-red-500/10">
          <p className="text-xs text-red-600 dark:text-red-400 uppercase font-semibold tracking-wider mb-1">Total Fees</p>
          <p className="text-lg font-bold text-red-700 dark:text-red-300">₹{totalFees.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
        </div>
        {overpaid > 0 ? (
          <div className="p-4 rounded-lg bg-yellow-500/5 border border-yellow-500/30">
            <p className="text-xs text-yellow-600 uppercase font-semibold tracking-wider mb-1">Overpaid Actual</p>
            <p className="text-lg font-bold text-yellow-700">₹{overpaid.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
          </div>
        ) : (
          <div className="p-4 rounded-lg bg-transparent border border-dashed flex items-center justify-center">
            <p className="text-xs text-muted-foreground italic">Fully balanced</p>
          </div>
        )}
      </div>

      <div className="border rounded-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground border-b">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Method</th>
                <th className="px-4 py-3 font-medium text-right">Original</th>
                <th className="px-4 py-3 font-medium text-right">Base (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading && payments.length === 0 ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3">
                      <Skeleton className="h-4 w-36" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-6 w-20 rounded-full" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Skeleton className="ml-auto h-4 w-24" />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Skeleton className="ml-auto h-4 w-28" />
                    </td>
                  </tr>
                ))
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-muted-foreground">No transactions recorded yet.</td>
                </tr>
              ) : (
                payments.map(p => {
                  const isRefund = p.type === "REFUND";
                  const pFees = p.fees?.reduce((s, f) => s + (f.amount || 0), 0) || 0;
                  
                  return (
                    <tr key={p._id} className={isRefund ? "bg-red-500/5" : ""}>
                      <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">
                        {format(new Date(p.createdAt), "dd MMM yyyy, HH:mm")}
                      </td>
                      <td className="px-4 py-3">
                        {isRefund ? (
                          <span className="flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded-full w-fit">
                            <RotateCcw className="w-3 h-3" /> Refund
                          </span>
                        ) : (
                          <span className="text-xs font-medium bg-muted px-2 py-0.5 rounded-full">Payment</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs">{p.method}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="font-medium">{p.currency} {decimalToNumber(p.receivedAmount).toLocaleString()}</div>
                        {pFees > 0 && <div className="text-xs text-muted-foreground">Fee: {pFees}</div>}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className={`font-bold ${isRefund ? "text-red-600" : "text-green-600"}`}>
                          {isRefund ? "-" : "+"}₹{decimalToNumber(p.receivedAmountBase).toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground">@ {decimalToNumber(p.exchangeRate)}</div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Footer */}
        <div className="flex items-center justify-between px-4 py-3 bg-muted/20 border-t">
          <p className="text-xs text-muted-foreground">
            {loading ? "Loading..." : `Page ${page}`}
          </p>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              disabled={page === 1 || loading}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Prev
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              disabled={!hasMore || loading}
              onClick={() => setPage(p => p + 1)}
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
