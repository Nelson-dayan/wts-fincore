"use client";

import { useState, useEffect } from "react";
import { X, Loader2, RefreshCw, Lock } from "lucide-react";
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
import { getBenchmarkRate, getCurrencyDecimals } from "@/lib/constants/finance";

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
  const [overrideReason, setOverrideReason] = useState("");

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
  const isSameCurrency = Boolean(fromAccount && toAccount && fromAccount.currency === toAccount.currency);

  const recalculateToAmount = (fromVal: string, feesVal: string, rateVal: string) => {
    const from = parseFloat(fromVal);
    const fee = parseFloat(feesVal) || 0;
    const rate = parseFloat(rateVal);
    if (!isNaN(from) && from > 0 && !isNaN(rate) && rate > 0 && fee >= 0 && fee < from) {
      const destDecimals = toAccount ? getCurrencyDecimals(toAccount.currency) : 2;
      const net = from - fee;
      const factor = Math.pow(10, destDecimals);
      const calculated = (Math.round((net * rate + Number.EPSILON) * factor) / factor).toFixed(destDecimals);
      setToAmount(calculated);
    } else {
      setToAmount("");
    }
  };

  // Sync exchange rate when accounts change
  useEffect(() => {
    let newRate = "1";
    if (isSameCurrency) {
      newRate = "1";
    } else if (fromAccount && toAccount) {
      const benchmark = getBenchmarkRate(fromAccount.currency, toAccount.currency);
      newRate = benchmark.toFixed(4);
    }
    setExchangeRate(newRate);
    recalculateToAmount(fromAmount, fees, newRate);
  }, [fromAccountId, toAccountId, isSameCurrency]);

  // Real-time parsed numbers
  const fromAmountNum = parseFloat(fromAmount);
  const toAmountNum = parseFloat(toAmount);
  const rateNum = parseFloat(exchangeRate);
  const feesNum = parseFloat(fees);

  const handleFromAmountChange = (val: string) => {
    setFromAmount(val);
    recalculateToAmount(val, fees, exchangeRate);
  };

  const handleFeesChange = (val: string) => {
    setFees(val);
    recalculateToAmount(fromAmount, val, exchangeRate);
  };

  const handleExchangeRateChange = (val: string) => {
    if (isSameCurrency) return; // Locked to 1 for same-currency
    setExchangeRate(val);
    recalculateToAmount(fromAmount, fees, val);
  };

  const handleResetExchangeRate = () => {
    let newRate = "1";
    if (isSameCurrency) {
      newRate = "1";
    } else if (fromAccount && toAccount) {
      const benchmark = getBenchmarkRate(fromAccount.currency, toAccount.currency);
      newRate = benchmark.toFixed(4);
    }
    setExchangeRate(newRate);
    recalculateToAmount(fromAmount, fees, newRate);
  };

  // Real-time field errors
  let fromAmountError = "";
  if (fromAmount !== "" && (isNaN(fromAmountNum) || fromAmountNum <= 0)) {
    fromAmountError = "Transfer amount must be greater than 0.";
  } else if (fromAccount && !isNaN(fromAmountNum) && fromAmountNum > fromAccount.currentBalance) {
    fromAmountError = `Amount exceeds available balance (${fromAccount.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })} ${fromAccount.currency}).`;
  }

  let rateError = "";
  if (exchangeRate !== "" && (isNaN(rateNum) || rateNum <= 0)) {
    rateError = "Exchange rate must be greater than 0.";
  } else if (isSameCurrency && rateNum !== 1) {
    rateError = "Same-currency transfer exchange rate must be 1.0.";
  }

  let feesError = "";
  if (fees !== "" && (isNaN(feesNum) || feesNum < 0)) {
    feesError = "Fees cannot be negative.";
  } else if (!isNaN(feesNum) && !isNaN(fromAmountNum) && fromAmountNum > 0 && feesNum >= fromAmountNum) {
    feesError = "Fees cannot be greater than or equal to transfer amount.";
  }

  let accountsError = "";
  if (fromAccountId && toAccountId && fromAccountId === toAccountId) {
    accountsError = "Source and destination accounts must be different.";
  }

  const isFormValid = Boolean(
    fromAccountId &&
    toAccountId &&
    fromAccountId !== toAccountId &&
    fromAmountNum > 0 &&
    toAmountNum > 0 &&
    rateNum > 0 &&
    feesNum >= 0 &&
    feesNum < fromAmountNum &&
    !fromAmountError &&
    !rateError &&
    !feesError &&
    !accountsError
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromAccountId || !toAccountId) return setError("Please select both accounts.");
    if (fromAccountId === toAccountId) return setError("Source and destination accounts must be different.");
    
    if (isNaN(fromAmountNum) || fromAmountNum <= 0) return setError("Please enter a valid transfer amount greater than 0.");
    if (fromAccount && fromAmountNum > fromAccount.currentBalance) {
      return setError(`Insufficient funds. Available balance in "${fromAccount.name}" is ${fromAccount.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })} ${fromAccount.currency}.`);
    }
    if (isNaN(feesNum) || feesNum < 0) return setError("Transfer fees cannot be negative.");
    if (feesNum >= fromAmountNum) return setError("Fees cannot be greater than or equal to transfer amount.");
    if (isNaN(toAmountNum) || toAmountNum <= 0) return setError("Calculated destination amount must be greater than 0.");
    if (isNaN(rateNum) || rateNum <= 0) return setError("Please enter a valid exchange rate greater than 0.");

    if (isSameCurrency && Math.abs(rateNum - 1.0) > 0.0001) {
      return setError("Same-currency transfers must have an exchange rate of 1.0.");
    }
    if (isNaN(feesNum) || feesNum < 0) return setError("Transfer fees cannot be negative.");

    if (isSameCurrency && Math.abs(rateNum - 1.0) > 0.0001) {
      return setError("Same-currency transfers must have an exchange rate of 1.0.");
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await apiFetch<any>(`${apiPrefix}/transfers`, {
        method: "POST",
        body: JSON.stringify({
          fromAccountId,
          toAccountId,
          fromAmount: fromAmountNum,
          toAmount: toAmountNum,
          exchangeRate: isSameCurrency ? 1.0 : rateNum,
          fees: feesNum || 0,
          reference,
          note,
          overrideReason: overrideReason.trim(),
        }),
      });
      if (res?.status === "PENDING_APPROVAL") {
        alert("Transfer queued for approval: Rate deviates >25% from benchmark. Funds will not move until approved by a second administrator.");
      }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[96vw] sm:max-w-[480px] bg-card rounded-2xl shadow-2xl border border-border overflow-hidden animate-in fade-in duration-200">
        
        {/* Header */}
        <div className="px-4 py-3.5 sm:px-6 sm:py-5 border-b bg-muted/10 flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-semibold tracking-tight">Transfer Funds</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Move money between internal accounts</p>
          </div>
          <button onClick={onClose} className="p-1.5 sm:p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors" aria-label="Close modal">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary/40" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-xs font-medium">
                {error}
              </div>
            )}

            {/* From & To Dropdowns */}
            <div className="space-y-1.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
              {accountsError && (
                <p className="text-[11px] text-destructive font-medium pl-0.5">{accountsError}</p>
              )}
            </div>

            {/* Sent & Received Amounts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-1">
              <div className="space-y-1.5">
                <Label className="text-xs">Sent Amount {fromAccount ? `(${fromAccount.currency})` : ""}</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={fromAmount}
                  onChange={(e) => handleFromAmountChange(e.target.value)}
                  className={fromAmountError ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {fromAmountError && (
                  <p className="text-[11px] text-destructive font-medium">{fromAmountError}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Received Amount {toAccount ? `(${toAccount.currency})` : ""}</Label>
                  <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> Auto-calculated
                  </span>
                </div>
                <Input
                  type="text"
                  readOnly
                  placeholder="0.00"
                  value={toAmount ? `${toAmount} ${toAccount?.currency || ""}` : ""}
                  className="bg-muted/40 cursor-default font-medium text-foreground select-none"
                />
              </div>
            </div>

            {/* Exchange Rate & Fees */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Exchange Rate</Label>
                  {isSameCurrency && (
                    <span className="text-[10px] text-muted-foreground font-medium">1:1 Same Currency</span>
                  )}
                </div>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.0001"
                    min="0.0001"
                    required
                    value={exchangeRate}
                    onChange={(e) => handleExchangeRateChange(e.target.value)}
                    disabled={isSameCurrency}
                    className={`pr-9 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                      rateError ? "border-destructive focus-visible:ring-destructive" : ""
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleResetExchangeRate}
                    disabled={isSameCurrency}
                    title="Reset to benchmark exchange rate"
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors group cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5 transition-transform duration-300 group-hover:rotate-180 group-active:scale-90" />
                  </button>
                </div>
                {rateError && (
                  <p className="text-[11px] text-destructive font-medium">{rateError}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Fees {fromAccount ? `(${fromAccount.currency})` : ""}</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={fees}
                  onChange={(e) => handleFeesChange(e.target.value)}
                  className={feesError ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {feesError && (
                  <p className="text-[11px] text-destructive font-medium">{feesError}</p>
                )}
              </div>
            </div>

            {/* Calculation Breakdown Card */}
            {fromAmountNum > 0 && rateNum > 0 && feesNum >= 0 && feesNum < fromAmountNum && (
              <div className="p-3.5 rounded-xl bg-muted/30 border border-border/70 text-xs space-y-1.5">
                <div className="flex justify-between text-muted-foreground">
                  <span>Transfer Amount:</span>
                  <span className="font-mono text-foreground font-medium">
                    {fromAmountNum.toLocaleString(undefined, { minimumFractionDigits: 2 })} {fromAccount?.currency}
                  </span>
                </div>
                {feesNum > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Less Transfer / Wire Fees:</span>
                    <span className="font-mono text-destructive font-medium">
                      - {feesNum.toLocaleString(undefined, { minimumFractionDigits: 2 })} {fromAccount?.currency}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-muted-foreground">
                  <span>Net Converted:</span>
                  <span className="font-mono text-foreground font-medium">
                    {(fromAmountNum - feesNum).toLocaleString(undefined, { minimumFractionDigits: 2 })} {fromAccount?.currency}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Exchange Rate:</span>
                  <span className="font-mono text-foreground font-medium">
                    × {rateNum.toFixed(4)}
                  </span>
                </div>
                <div className="pt-1.5 border-t border-border/60 flex justify-between font-semibold">
                  <span className="text-foreground">Total Received:</span>
                  <span className="font-mono text-primary text-sm font-bold">
                    {toAmount} {toAccount?.currency}
                  </span>
                </div>
              </div>
            )}

            {/* Override Reason (Cross-Currency) */}
            {!isSameCurrency && (
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Exchange Rate Override Reason / Bank Quote Ref
                  <span className="text-muted-foreground font-normal ml-1">(Required if deviating &gt;10%)</span>
                </Label>
                <Input
                  placeholder="e.g. Bank spot wire quote #FX-9821, treasury contract ref"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                />
              </div>
            )}

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
            <div className="pt-4 flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
              <Button type="button" variant="outline" className="w-full sm:flex-1" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" className="w-full sm:flex-1 gap-2" disabled={!isFormValid || submitting}>
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
