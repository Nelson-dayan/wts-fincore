"use client";

import { useState, useEffect } from "react";
import { X, CreditCard, Receipt, Calendar, User, ArrowRight, History, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

interface PaymentDetailModalProps {
  paymentId: string;
  apiPrefix: string;
  onClose: () => void;
  onOpenStatement?: (invoiceId: string) => void;
}

export function PaymentDetailModal({ paymentId, apiPrefix, onClose, onOpenStatement }: PaymentDetailModalProps) {
  const [payment, setPayment] = useState<any>(null);
  const [relatedPayments, setRelatedPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllRelated, setShowAllRelated] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${apiPrefix}/payments/${paymentId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to load payment details");
        setPayment(data.item);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [paymentId, apiPrefix]);

  const loadRelated = async () => {
    if (!payment?.invoiceId?._id) return;
    try {
      const res = await fetch(`${apiPrefix}/payments?invoiceId=${payment.invoiceId._id}`);
      const data = await res.json();
      if (res.ok) {
        setRelatedPayments(data.items || []);
        setShowAllRelated(true);
      }
    } catch (err) {
      console.error("Failed to load related payments", err);
    }
  };

  if (!payment && loading) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <div className="bg-card w-full max-w-lg rounded-2xl p-6 shadow-2xl border">
          <Skeleton className="h-8 w-1/2 mb-4" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-20 w-full mb-4" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <div className="bg-card w-full max-w-lg rounded-2xl p-6 shadow-2xl border text-center">
          <p className="text-destructive font-medium mb-4">{error}</p>
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative bg-card w-full max-w-xl rounded-2xl shadow-2xl border border-border/60 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between bg-muted/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Transaction Details</h3>
              <p className="text-xs text-muted-foreground font-mono">{payment?._id}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar">
          {/* Main Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
              <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-1">Gross Payment Sent</p>
              <p className="text-xl font-bold">
                {payment?.paymentCurrency || payment?.currency || "INR"} {(payment?.paymentAmountGross ?? payment?.amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                ≈ ₹{((payment?.amountBase ?? 0) + (payment?.feeAmountBase ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })} (Base)
              </p>
            </div>
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
              <p className="text-[10px] uppercase font-bold tracking-widest text-primary mb-1">Net Converted Received</p>
              <p className="text-xl font-bold text-primary">
                {payment?.currency || "INR"} {(payment?.amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-primary/60 mt-0.5">
                ≈ ₹{(payment?.amountBase ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} (Base)
              </p>
            </div>
          </div>

          {/* Details List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm py-2 border-b border-border/40">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Receipt className="w-4 h-4" /> <span>Invoice</span>
              </div>
              <span className="font-semibold text-primary">
                {payment?.invoiceId?.invoiceNumber || (payment?.allocations && payment.allocations.length > 0
                  ? payment.allocations.map((a: any) => a.invoiceId?.invoiceNumber).filter(Boolean).join(", ")
                  : "N/A")}
              </span>
            </div>
            {payment?.referenceNumber && (
              <div className="flex items-center justify-between text-sm py-2 border-b border-border/40">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <FileText className="w-4 h-4" /> <span>Reference Number / Tx ID</span>
                </div>
                <span className="font-semibold font-mono text-xs">{payment.referenceNumber}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm py-2 border-b border-border/40">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" /> <span>Date & Time</span>
              </div>
              <span className="font-medium">{payment?.receivedAt ? format(new Date(payment.receivedAt), "PPP p") : payment?.createdAt ? format(new Date(payment.createdAt), "PPP p") : "N/A"}</span>
            </div>
            <div className="flex items-center justify-between text-sm py-2 border-b border-border/40">
              <div className="flex items-center gap-2 text-muted-foreground">
                <ArrowRight className="w-4 h-4" /> <span>Payment Method</span>
              </div>
              <span className="px-2 py-0.5 bg-muted rounded text-xs font-bold uppercase tracking-wider">{payment?.method}</span>
            </div>
            <div className="flex items-center justify-between text-sm py-2 border-b border-border/40">
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="w-4 h-4" /> <span>Recorded By</span>
              </div>
              <span className="font-medium">{payment?.createdBy?.name || "System"}</span>
            </div>
            {payment?.note && (
              <div className="flex flex-col gap-1.5 p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/10 text-xs text-amber-800">
                <span className="font-bold uppercase tracking-wider text-[9px] text-amber-600/80">Transaction Note</span>
                <span className="font-medium">{payment.note}</span>
              </div>
            )}
          </div>

          {/* Allocations Breakdown */}
          {payment?.allocations && payment.allocations.length > 0 && (
            <div className="p-4 rounded-xl border bg-muted/10">
              <p className="text-xs font-bold uppercase text-muted-foreground mb-3">Invoice Allocations</p>
              <div className="space-y-3">
                {payment.allocations.map((alloc: any, idx: number) => {
                  const invoice = alloc.invoiceId;
                  const invNum = invoice?.invoiceNumber || "Unknown Invoice";
                  const invCurrency = alloc.allocatedCurrency || "USD";
                  const amt = alloc.allocatedAmount ?? 0;
                  const rate = alloc.exchangeRateUsed ?? 1;
                  return (
                    <div key={idx} className="flex items-center justify-between text-sm py-1.5 border-b border-border/20 last:border-0">
                      <div className="flex flex-col">
                        <span className="font-semibold text-primary">{invNum}</span>
                        <span className="text-[10px] text-muted-foreground">
                          Rate: {rate.toFixed(4)} ({payment.currency} &rarr; {invCurrency})
                        </span>
                      </div>
                      <div className="flex flex-col items-end text-right">
                        <span className="font-bold text-foreground">
                          {invCurrency} {amt.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          ≈ ₹{(alloc.allocatedAmountBase ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} (Base)
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Fees */}
          {payment?.fees && payment.fees.length > 0 && (
            <div className="p-4 rounded-xl border bg-muted/10">
              <p className="text-xs font-bold uppercase text-muted-foreground mb-3">Gateway & Bank Fees</p>
              <div className="space-y-2">
                {payment.fees.map((fee: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{fee.label || fee.type.replace(/_/g, ' ')}</span>
                    <span className="font-mono text-red-500 font-medium">-{fee.currency || payment.currency} {fee.amount}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Related Payments Section */}
          <div className="pt-4 border-t">
            {!showAllRelated ? (
              <Button 
                variant="outline" 
                className="w-full gap-2 text-muted-foreground hover:text-primary transition-all group"
                onClick={loadRelated}
                disabled={!payment?.invoiceId?._id}
              >
                <History className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                View Other Payments for {payment?.invoiceId?.invoiceNumber || "Invoice"}
              </Button>
            ) : (
              <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
                <p className="text-xs font-bold uppercase text-muted-foreground mb-1">Invoice Payment History</p>
                <div className="space-y-2">
                  {relatedPayments.map((p) => (
                    <div 
                      key={p._id} 
                      className={`p-3 rounded-lg border flex items-center justify-between ${p._id === paymentId ? 'bg-primary/5 border-primary/20 ring-1 ring-primary/10' : 'bg-background border-border/50'}`}
                    >
                      <div className="flex flex-col">
                        <span className="text-xs font-bold">{p.method}</span>
                        <span className="text-[10px] text-muted-foreground">{format(new Date(p.createdAt), "dd MMM, HH:mm")}</span>
                      </div>
                      <div className="flex flex-col items-end text-right">
                        <span className="text-sm font-bold text-primary">{p.currency} {(p.amount ?? p.receivedAmount ?? 0).toLocaleString()}</span>
                        {p._id === paymentId && <span className="text-[9px] text-primary font-bold uppercase">Current</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-muted/10 flex justify-between items-center">
          {onOpenStatement && payment?.invoiceId?._id && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-primary font-bold gap-2"
              onClick={() => onOpenStatement(payment.invoiceId._id)}
            >
              <FileText className="w-4 h-4" />
              Full Financial Statement
            </Button>
          ) || <div />}
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}
