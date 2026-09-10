"use client";

import { useState, useEffect } from "react";
import { X, Check, Loader2, AlertCircle, Sparkles, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api/client";

interface CreditPayment {
  paymentId: string;
  referenceNumber: string;
  currency: string;
  netAmount: number;
  unallocatedAmount: number;
  unallocatedAmountBase: number;
  exchangeRateToBase: number;
  receivedAt: string;
}

interface ApplyCreditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  invoiceId: string;
  invoiceNumber: string;
  invoiceCurrency: string;
  invoiceUnpaidBase: number;
  creditPayments: CreditPayment[];
  apiPrefix: string;
}

export function ApplyCreditModal({
  isOpen,
  onClose,
  onSuccess,
  invoiceId,
  invoiceNumber,
  invoiceCurrency,
  invoiceUnpaidBase,
  creditPayments,
  apiPrefix,
}: ApplyCreditModalProps) {
  const [selectedPaymentId, setSelectedPaymentId] = useState("");
  const [amountToApply, setAmountToApply] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const selectedPayment = creditPayments.find(p => p.paymentId === selectedPaymentId);

  // Conversion rate from Payment Currency to Invoice Currency
  const invoiceRateToBase = invoiceUnpaidBase > 0 ? 1.0 : 1.0; // Handled dynamically on the API side
  
  // Calculate maximum outstanding amount on invoice in invoice currency
  // Let's get the exchange rate from the selected payment to invoice currency
  const paymentRateToBase = selectedPayment ? selectedPayment.exchangeRateToBase : 1.0;
  
  // Determine invoice unpaid amount in its own currency
  // Since we have invoiceUnpaidBase (in INR), we can convert to invoice currency
  // Let's use the static rate or let's calculate it if invoice rate is available
  const [invoiceRateToBaseLive, setInvoiceRateToBaseLive] = useState(1.0);

  useEffect(() => {
    if (isOpen && invoiceId) {
      apiFetch<{ item?: { totalsCache?: { totalIntendedBase?: number }, totals?: { total?: number } } }>(
        `${apiPrefix}/invoices/${invoiceId}`
      )
        .then(res => {
          const totalIntended = res.item?.totalsCache?.totalIntendedBase ?? 0;
          const total = res.item?.totals?.total ?? 1;
          if (totalIntended > 0) {
            setInvoiceRateToBaseLive(totalIntended / total);
          }
        })
        .catch(err => console.warn("Failed to determine live invoice rate:", err));
    }
  }, [isOpen, invoiceId, apiPrefix]);

  const unpaidInInvoiceCurrency = invoiceUnpaidBase / invoiceRateToBaseLive;

  // Max that can be allocated in invoice currency
  const maxInInvoiceCurrency = selectedPayment 
    ? Math.min(
        unpaidInInvoiceCurrency,
        selectedPayment.unallocatedAmount * (paymentRateToBase / invoiceRateToBaseLive)
      )
    : 0;

  useEffect(() => {
    if (selectedPaymentId) {
      setAmountToApply(parseFloat(maxInInvoiceCurrency.toFixed(4)));
    } else {
      setAmountToApply(0);
    }
  }, [selectedPaymentId, maxInInvoiceCurrency]);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPaymentId || amountToApply <= 0) return;
    setSubmitting(true);
    setError("");

    try {
      const res = await apiFetch<{ success?: boolean; message?: string }>(
        `${apiPrefix}/payments/allocate-credit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentId: selectedPaymentId,
            invoiceId,
            amount: amountToApply
          })
        }
      );

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        throw new Error(res.message || "Failed to allocate credit");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Credit allocation failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative bg-card w-full max-w-lg rounded-2xl shadow-2xl border border-border/60 flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between bg-muted/10">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="w-5 h-5 animate-pulse text-primary" />
            <h3 className="font-bold text-base tracking-tight">Apply Client credit balance</h3>
          </div>
          <button 
            onClick={onClose} 
            disabled={submitting}
            className="p-1.5 hover:bg-muted rounded-full transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleApply} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs font-semibold text-destructive flex items-center gap-1.5 animate-shake">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Target Invoice</span>
            <div className="p-3 rounded-xl bg-muted/20 border border-border/80 flex justify-between items-center text-xs">
              <span className="font-bold">{invoiceNumber}</span>
              <span className="font-mono text-muted-foreground font-semibold">
                Unpaid Balance: {invoiceCurrency} {unpaidInInvoiceCurrency.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Select Payment Credit Pool</Label>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {creditPayments.map(p => {
                const isSelected = p.paymentId === selectedPaymentId;
                const formattedDate = new Date(p.receivedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                return (
                  <button
                    key={p.paymentId}
                    type="button"
                    onClick={() => setSelectedPaymentId(p.paymentId)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                      isSelected 
                        ? 'border-primary bg-primary/5 shadow-sm' 
                        : 'border-border/60 hover:bg-muted/30 bg-background/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isSelected ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        <Receipt className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-foreground">Ref: {p.referenceNumber}</span>
                        <span className="text-[10px] text-muted-foreground">{formattedDate}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-xs font-bold text-foreground">
                        {p.currency} {p.unallocatedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                      {isSelected && (
                        <div className="size-4 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                          <Check className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedPaymentId && (
            <div className="space-y-3 pt-3 border-t border-dashed border-border/80 animate-in slide-in-from-top-2">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Amount to Apply ({invoiceCurrency})</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="0.0001"
                    min="0.0001"
                    max={maxInInvoiceCurrency}
                    value={amountToApply || ""}
                    onChange={e => setAmountToApply(Number(e.target.value))}
                    className="h-10 text-sm font-semibold"
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-10 text-xs px-3 font-semibold shrink-0"
                    onClick={() => setAmountToApply(parseFloat(maxInInvoiceCurrency.toFixed(4)))}
                  >
                    Apply Max
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Maximum allocation: {invoiceCurrency} {maxInInvoiceCurrency.toLocaleString(undefined, { minimumFractionDigits: 4 })}
                </p>
              </div>
            </div>
          )}

          {submitting && (
            <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 space-y-2 animate-pulse">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
                <span className="text-xs font-bold text-foreground">🔒 Booking Safe Ledger Adjustments...</span>
              </div>
              <p className="text-[9px] text-muted-foreground leading-normal pl-6">
                WTS-FinCore double-charge guards are checking allocations to prevent balance duplicate entries.
              </p>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-muted/10 flex items-center justify-end gap-3 shrink-0">
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button 
            onClick={handleApply}
            disabled={submitting || !selectedPaymentId || amountToApply <= 0 || amountToApply > maxInInvoiceCurrency + 0.001}
            className="min-w-[120px]"
          >
            {submitting ? "Applying..." : "Settle Balance"}
          </Button>
        </div>
      </div>
    </div>
  );
}
