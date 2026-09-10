"use client";

import { useState, useEffect } from "react";
import { X, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { apiFetch } from "@/lib/api/client";

interface Account {
  _id: string;
  name: string;
  currency: string;
  currentBalance: number;
}

interface TransferFundsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  apiPrefix: string;
}

export function TransferFundsModal({ isOpen, onClose, onSuccess, apiPrefix }: TransferFundsModalProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  const [exchangeRate, setExchangeRate] = useState("1");
  const [fees, setFees] = useState("0");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    let alive = true;
    async function loadAccounts() {
      try {
        const res = await apiFetch<{ items: Account[] }>(`${apiPrefix}/accounts`);
        if (alive) {
          const active = res.items || [];
          setAccounts(active);
          if (active.length > 0) {
            setFromAccountId(active[0]._id);
            if (active.length > 1) {
              setToAccountId(active[1]._id);
            } else {
              setToAccountId(active[0]._id);
            }
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (alive) setLoading(false);
      }
    }
    loadAccounts();
    return () => {
      alive = false;
    };
  }, [isOpen, apiPrefix]);

  const fromAccount = accounts.find((a) => a._id === fromAccountId);
  const toAccount = accounts.find((a) => a._id === toAccountId);

  // Auto-calculation logic
  const handleFromAmountChange = (val: string) => {
    setFromAmount(val);
    const amount = parseFloat(val);
    const rate = parseFloat(exchangeRate);
    if (!isNaN(amount) && !isNaN(rate)) {
      setToAmount((amount * rate).toFixed(2));
    } else {
      setToAmount("");
    }
  };

  const handleExchangeRateChange = (val: string) => {
    setExchangeRate(val);
    const amount = parseFloat(fromAmount);
    const rate = parseFloat(val);
    if (!isNaN(amount) && !isNaN(rate)) {
      setToAmount((amount * rate).toFixed(2));
    } else {
      setToAmount("");
    }
  };

  const handleToAmountChange = (val: string) => {
    setToAmount(val);
    const origin = parseFloat(fromAmount);
    const target = parseFloat(val);
    if (!isNaN(origin) && !isNaN(target) && origin > 0) {
      setExchangeRate((target / origin).toFixed(4));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromAccountId || !toAccountId) return setError("Please select both accounts.");
    if (fromAccountId === toAccountId) return setError("Source and destination accounts must be different.");
    
    const sentAmount = parseFloat(fromAmount);
    const receivedAmount = parseFloat(toAmount);
    const rate = parseFloat(exchangeRate);
    
    if (isNaN(sentAmount) || sentAmount <= 0) return setError("Please enter a valid transfer amount.");
    if (isNaN(receivedAmount) || receivedAmount <= 0) return setError("Please enter a valid destination amount.");
    if (isNaN(rate) || rate <= 0) return setError("Please enter a valid exchange rate.");

    setSubmitting(true);
    setError("");

    try {
      await apiFetch(`${apiPrefix}/transfers`, {
        method: "POST",
        body: JSON.stringify({
          fromAccountId,
          toAccountId,
          fromAmount: sentAmount,
          toAmount: receivedAmount,
          exchangeRate: rate,
          fees: parseFloat(fees) || 0,
          reference,
          note,
        }),
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to execute transfer");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[480px] bg-card rounded-2xl shadow-2xl border border-border overflow-hidden animate-in fade-in duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 border-b bg-muted/10 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Transfer Funds</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Move money between internal accounts</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary/40" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-xs font-medium">
                {error}
              </div>
            )}

            {/* From & To Dropdowns */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">From Account</Label>
                <Select
                  value={fromAccountId}
                  onChange={(e) => setFromAccountId(e.target.value)}
                  options={accounts.map((a) => ({
                    value: a._id,
                    label: `${a.name} (${a.currency})`,
                  }))}
                />
                {fromAccount && (
                  <span className="text-[10px] text-muted-foreground pl-1 block">
                    Bal: {fromAccount.currency} {fromAccount.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">To Account</Label>
                <Select
                  value={toAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                  options={accounts.map((a) => ({
                    value: a._id,
                    label: `${a.name} (${a.currency})`,
                  }))}
                />
                {toAccount && (
                  <span className="text-[10px] text-muted-foreground pl-1 block">
                    Bal: {toAccount.currency} {toAccount.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                )}
              </div>
            </div>

            {/* Sent & Received Amounts */}
            <div className="grid grid-cols-2 gap-4 pt-1">
              <div className="space-y-1.5">
                <Label className="text-xs">Sent Amount {fromAccount ? `(${fromAccount.currency})` : ""}</Label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={fromAmount}
                  onChange={(e) => handleFromAmountChange(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Received Amount {toAccount ? `(${toAccount.currency})` : ""}</Label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={toAmount}
                  onChange={(e) => handleToAmountChange(e.target.value)}
                />
              </div>
            </div>

            {/* Exchange Rate & Fees */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Exchange Rate</Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.0001"
                    required
                    value={exchangeRate}
                    onChange={(e) => handleExchangeRateChange(e.target.value)}
                    className="pr-8"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <RefreshCw className="w-3.5 h-3.5 text-muted-foreground/50" />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Fees {fromAccount ? `(${fromAccount.currency})` : ""}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={fees}
                  onChange={(e) => setFees(e.target.value)}
                />
              </div>
            </div>

            {/* Reference */}
            <div className="space-y-1.5">
              <Label className="text-xs">Reference Number</Label>
              <Input
                placeholder="e.g. Wire ID, TXN ID"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>

            {/* Internal Note */}
            <div className="space-y-1.5">
              <Label className="text-xs">Internal Notes</Label>
              <textarea
                className="w-full min-h-[70px] rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Narrative describing this transfer..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            {/* Footer Buttons */}
            <div className="pt-4 flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1 gap-2" disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Execute Transfer
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
