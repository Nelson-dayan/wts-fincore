"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { Plus, CreditCard, RotateCcw, X } from "lucide-react";
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

export function PaymentsCard({ 
  invoiceId, 
  companyId,
  invoiceCurrency = "AED",
  invoiceExchangeRate = 1 
}: { 
  invoiceId: string;
  companyId: string;
  invoiceCurrency?: string;
  invoiceExchangeRate?: number;
}) {
  const { apiPrefix } = usePortalConfig();
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);

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

  const loadPayments = useCallback(async () => {
    if (!invoiceId) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiPrefix}/payments?invoiceId=${invoiceId}&limit=50`);
      const data = await res.json();
      if (res.ok) setPayments(data.items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [apiPrefix, invoiceId]);

  useEffect(() => {
    if (!invoiceId) {
      setPayments([]);
      setLoading(false);
      return;
    }
    setPayments([]);
    void loadPayments();
  }, [invoiceId, loadPayments]);

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
      
      if (!res.ok) throw new Error((data as any).message || "Failed to record payment");
      
      setDrawerOpen(false);
      loadPayments();
      
      // Reset form
      setIntendedAmount(0);
      setReceivedAmount(0);
      setFeeAmount(0);
      setType("PAYMENT");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const totals = payments.reduce((acc, p) => {
    const mult = p.type === "REFUND" ? -1 : 1;
    acc.intended += (p.intendedAmountBase || 0) * mult;
    acc.received += (p.receivedAmountBase || 0) * mult;
    acc.fees += p.fees.reduce((sum, f) => sum + (f.amount * p.exchangeRate), 0);
    return acc;
  }, { intended: 0, received: 0, fees: 0 });

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
        <div className="fixed inset-0 z-50 flex justify-end bg-black/20 backdrop-blur-sm transition-opacity">
          <div className="w-full max-w-md bg-background h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="font-semibold text-lg">Record Transaction</h3>
                <p className="text-xs text-muted-foreground">Backend calculations will use the exchange rate provided.</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setDrawerOpen(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1">
              <form id="payment-form" onSubmit={handleSubmit} className="space-y-6">
                {error && <div className="text-xs text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select 
                      value={type} 
                      onChange={(e: any) => setType(e.target.value)}
                      options={[
                        {value: "PAYMENT", label: "Payment"},
                        {value: "REFUND", label: "Refund"}
                      ]}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Method</Label>
                    <Select 
                      value={method} 
                      onChange={(e: any) => setMethod(e.target.value)}
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={3} />
                  </div>
                  <div className="space-y-2">
                    <Label>Exchange Rate (to INR)</Label>
                    <Input type="number" step="0.0001" min="0" required value={exchangeRate} onChange={(e) => setExchangeRate(Number(e.target.value))} />
                  </div>
                </div>

                <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                  <div className="space-y-2">
                    <Label>{type === "REFUND" ? "Refund Amount" : "Intended Amount (Client Paid)"}</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground w-12">{currency}</span>
                      <Input type="number" step="0.01" min="0" required value={intendedAmount} onChange={(e) => setIntendedAmount(Number(e.target.value))} />
                    </div>
                    <p className="text-xs text-muted-foreground text-right">≈ ₹{(intendedAmount * exchangeRate).toLocaleString()}</p>
                  </div>

                  <div className="space-y-2">
                    <Label>{type === "REFUND" ? "Refund Handed Over" : "Received Amount (Hit Bank)"}</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground w-12">{currency}</span>
                      <Input type="number" step="0.01" min="0" required value={receivedAmount} onChange={(e) => setReceivedAmount(Number(e.target.value))} />
                    </div>
                    <p className="text-xs text-muted-foreground text-right">≈ ₹{(receivedAmount * exchangeRate).toLocaleString()}</p>
                  </div>

                  {type === "PAYMENT" && (
                    <div className="space-y-2">
                      <Label>Deducted Fees</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground w-12">{currency}</span>
                        <Input type="number" step="0.01" min="0" value={feeAmount} onChange={(e) => setFeeAmount(Number(e.target.value))} />
                      </div>
                      <p className="text-xs text-muted-foreground text-right">≈ ₹{(feeAmount * exchangeRate).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </form>
            </div>
            
            <div className="p-4 border-t">
              <Button type="submit" form="payment-form" disabled={submitting} className="w-full">
                {submitting ? "Processing..." : `Confirm ${type}`}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 rounded-lg bg-brand/5 border border-brand/10">
          <p className="text-sm text-brand-accent mb-1">Total Intended (Base)</p>
          <p className="text-2xl font-bold text-brand">₹{totals.intended.toLocaleString()}</p>
        </div>
        <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/10 dark:bg-green-500/10">
          <p className="text-sm text-green-600 dark:text-green-400 mb-1">Total Received (Base)</p>
          <p className="text-2xl font-bold text-green-700 dark:text-green-300">₹{totals.received.toLocaleString()}</p>
        </div>
        <div className="p-4 rounded-lg bg-red-500/5 border border-red-500/10 dark:bg-red-500/10">
          <p className="text-sm text-red-600 dark:text-red-400 mb-1">Total Fees (Base)</p>
          <p className="text-2xl font-bold text-red-700 dark:text-red-300">₹{totals.fees.toLocaleString()}</p>
        </div>
      </div>

      <div className="border rounded-md overflow-x-auto">
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
                const totalFees = p.fees?.reduce((s, f) => s + (f.amount || 0), 0) || 0;
                
                return (
                  <tr key={p._id} className={isRefund ? "bg-red-500/5" : ""}>
                    <td className="px-4 py-3 font-mono text-xs">{format(new Date(p.createdAt), "dd MMM yyyy, HH:mm")}</td>
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
                    <td className="px-4 py-3 text-right">
                      <div className="font-medium">{p.currency} {decimalToNumber(p.receivedAmount).toLocaleString()}</div>
                      {totalFees > 0 && <div className="text-xs text-muted-foreground">Fee: {totalFees}</div>}
                    </td>
                    <td className="px-4 py-3 text-right">
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
    </div>
  );
}
