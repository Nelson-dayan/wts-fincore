"use client";

import { useState, useEffect } from "react";
import { X, CreditCard, Loader2, Calculator, Lock, Plus, Trash2, CheckCircle2, AlertTriangle, Info, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ProjectSearchPicker } from "@/components/portals/project-search-picker";
import { apiFetch } from "@/lib/api/client";
import { SUPPORTED_CURRENCIES } from "@/lib/constants/finance";
import { 
  normalizeToBase, 
  convertBaseToTreasury,
  STATIC_FX_RATES 
} from "@/lib/services/finance/forex.engine";

function formatHumanRate(rate: number, from: string, to: string): string {
  const f = from.toUpperCase();
  const t = to.toUpperCase();
  if (f === t || rate === 1.0) {
    return `${f} \u2192 ${t} = 1.00`;
  }
  if (rate < 1.0) {
    return `1 ${t} = ${(1 / rate).toFixed(2)} ${f}`;
  }
  return `1 ${f} = ${rate.toFixed(2)} ${t}`;
}

function getExchangeRate(from: string, to: string): number {
  const f = from.toUpperCase();
  const t = to.toUpperCase();
  if (f === t) return 1.0;
  const fromRate = STATIC_FX_RATES[f] || 1.0;
  const toRate = STATIC_FX_RATES[t] || 1.0;
  return fromRate / toRate;
}

export type InvoiceRow = {
  _id: string;
  invoiceNumber: string;
  total: number;
  currency?: string;
  invoiceType?: string;
  status: string;
  companyId?: string;
  projectId?: string;
  clientId?: string;
  dueDate?: string;
  totalsCache?: {
    totalIntendedBase?: number;
    totalReceivedBase?: number;
  };
};

export type AccountRow = {
  _id: string;
  name: string;
  currency: string;
};

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  apiPrefix: string;
  initialProjectId?: string;
  initialInvoiceId?: string;
}

export function RecordPaymentModal({
  isOpen,
  onClose,
  onSuccess,
  apiPrefix,
  initialProjectId = "",
  initialInvoiceId = ""
}: RecordPaymentModalProps) {
  const [projectId, setProjectId] = useState(initialProjectId);
  const [accountId, setAccountId] = useState("");
  
  const [projectsInvoices, setProjectsInvoices] = useState<InvoiceRow[]>([]);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  
  const [type, setType] = useState("PAYMENT");
  const [method, setMethod] = useState("BANK_TRANSFER");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [note, setNote] = useState("");

  // Payment Currency & Forex states
  const [isDifferentCurrency, setIsDifferentCurrency] = useState(false);
  const [paymentCurrency, setPaymentCurrency] = useState("USD");
  const [conversionRate, setConversionRate] = useState(1.0);
  const [grossAmount, setGrossAmount] = useState(0);
  const [exchangeRateToBase, setExchangeRateToBase] = useState(1.0);

  // Live Rates dynamic state
  const [fetchingLiveRate, setFetchingLiveRate] = useState(false);
  const [isManualRate, setIsManualRate] = useState(false);
  const [isManualBaseRate, setIsManualBaseRate] = useState(false);
  const [isRateLive, setIsRateLive] = useState(true);
  const [isBaseRateLive, setIsBaseRateLive] = useState(true);

  // Dynamic Fees states
  const [includeFees, setIncludeFees] = useState(false);
  const [fees, setFees] = useState<Array<{
    title: string;
    amount: number;
    currency: string;
    category: "GATEWAY_FEE" | "BANK_CHARGE" | "GST_ON_FEE" | "FOREX" | "TDS" | "OTHER";
  }>>([]);

  // Allocation state
  const [allocateToInvoice, setAllocateToInvoice] = useState(!!initialInvoiceId);
  const [allocations, setAllocations] = useState<Array<{ invoiceId: string; amount: number; rate: number }>>(() => {
    if (initialInvoiceId) {
      return [{ invoiceId: initialInvoiceId, amount: 0, rate: 1 }];
    }
    return [];
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Load Accounts
  useEffect(() => {
    if (isOpen) {
      setLoadingAccounts(true);
      apiFetch<{ items: AccountRow[] }>(`${apiPrefix}/accounts`)
        .then(res => {
          setAccounts(res.items || []);
          if (res.items?.length > 0 && !accountId) {
            setAccountId(res.items[0]._id);
          }
        })
        .finally(() => setLoadingAccounts(false));
    }
  }, [isOpen, apiPrefix]);

  // Load Project Invoices
  useEffect(() => {
    if (isOpen && projectId) {
      setLoadingInvoices(true);
      apiFetch<{ items: InvoiceRow[] }>(`${apiPrefix}/invoices?projectId=${projectId}`)
        .then(res => {
          setProjectsInvoices(res.items || []);
          if (projectId !== initialProjectId) {
            setAllocations([]);
            setAllocateToInvoice(false);
          }
        })
        .finally(() => setLoadingInvoices(false));
    }
  }, [isOpen, projectId, apiPrefix, initialProjectId]);

  const selectedAccount = accounts.find(a => a._id === accountId);
  const accountCurrency = selectedAccount?.currency || "INR";

  // Dynamic Live Exchange Rate Fetchers
  const fetchLiveExchangeRates = async (from: string, to: string, force = false) => {
    if (from === to) {
      if (!isManualRate || force) {
        setConversionRate(1.0);
        if (force) setIsManualRate(false);
      }
      setIsRateLive(true);
      return;
    }
    setFetchingLiveRate(true);
    try {
      const res = await apiFetch<{ source?: string; rates: Record<string, number> }>(
        `${apiPrefix}/exchange-rates?base=${from}`
      );
      if (res && res.rates) {
        const rate = res.rates[to];
        if (rate) {
          if (!isManualRate || force) {
            setConversionRate(rate);
            if (force) setIsManualRate(false);
          }
          setIsRateLive(res.source === "live");
        }
      }
    } catch (err) {
      console.warn("Failed to fetch live exchange rate, falling back to static math:", err);
      const fallbackRate = getExchangeRate(from, to);
      if (!isManualRate || force) {
        setConversionRate(fallbackRate);
        if (force) setIsManualRate(false);
      }
      setIsRateLive(false);
    } finally {
      setFetchingLiveRate(false);
    }
  };

  const fetchLiveBaseRate = async (accCurrency: string, force = false) => {
    if (accCurrency === "INR") {
      if (!isManualBaseRate || force) {
        setExchangeRateToBase(1.0);
        if (force) setIsManualBaseRate(false);
      }
      setIsBaseRateLive(true);
      return;
    }
    try {
      const res = await apiFetch<{ source?: string; rates: Record<string, number> }>(
        `${apiPrefix}/exchange-rates?base=${accCurrency}`
      );
      if (res && res.rates) {
        const rate = res.rates["INR"];
        if (rate) {
          if (!isManualBaseRate || force) {
            setExchangeRateToBase(rate);
            if (force) setIsManualBaseRate(false);
          }
          setIsBaseRateLive(res.source === "live");
        }
      }
    } catch (err) {
      console.warn("Failed to fetch base exchange rate, falling back to static math:", err);
      const fallbackRate = STATIC_FX_RATES[accCurrency] || 1.0;
      if (!isManualBaseRate || force) {
        setExchangeRateToBase(fallbackRate);
        if (force) setIsManualBaseRate(false);
      }
      setIsBaseRateLive(false);
    }
  };

  const fetchAllocationRate = async (idx: number, from: string, to: string, invoiceId: string) => {
    if (from === to) {
      setAllocations(prev => prev.map((row, i) => 
        (i === idx && row.invoiceId === invoiceId) ? { ...row, rate: 1.0 } : row
      ));
      return;
    }
    try {
      const res = await apiFetch<{ rates: Record<string, number> }>(
        `${apiPrefix}/exchange-rates?base=${from}`
      );
      if (res && res.rates) {
        const rate = res.rates[to];
        if (rate) {
          setAllocations(prev => prev.map((row, i) => 
            (i === idx && row.invoiceId === invoiceId) ? { ...row, rate } : row
          ));
        }
      }
    } catch (err) {
      const fallbackRate = getExchangeRate(from, to);
      setAllocations(prev => prev.map((row, i) => 
        (i === idx && row.invoiceId === invoiceId) ? { ...row, rate: fallbackRate } : row
      ));
    }
  };

  // Lock target currency when conversion toggles change
  useEffect(() => {
    if (selectedAccount) {
      if (!isDifferentCurrency) {
        setPaymentCurrency(selectedAccount.currency);
        setConversionRate(1.0);
        setIsManualRate(false);
      }
    }
  }, [accountId, selectedAccount, isDifferentCurrency]);

  // Load live base rate when account changes
  useEffect(() => {
    if (isOpen && selectedAccount) {
      if (!isManualBaseRate) {
        fetchLiveBaseRate(accountCurrency);
      }
    }
  }, [isOpen, accountId, accountCurrency]);

  // Load live conversion rate when currency or toggle changes
  useEffect(() => {
    if (isOpen && isDifferentCurrency && selectedAccount) {
      if (!isManualRate) {
        fetchLiveExchangeRates(paymentCurrency, accountCurrency);
      }
    }
  }, [isOpen, isDifferentCurrency, paymentCurrency, accountCurrency]);

  // Sync allocations rate when account currency changes
  useEffect(() => {
    if (isOpen && allocateToInvoice && allocations.length > 0 && projectsInvoices.length > 0) {
      allocations.forEach((alloc, idx) => {
        const matchingInvoice = projectsInvoices.find(inv => inv._id === alloc.invoiceId);
        if (matchingInvoice) {
          const invCurrency = (matchingInvoice.currency || (matchingInvoice.invoiceType === "usd" ? "USD" : "AED")).toUpperCase();
          fetchAllocationRate(idx, accountCurrency, invCurrency, alloc.invoiceId);
        }
      });
    }
  }, [accountCurrency, isOpen, allocateToInvoice, projectsInvoices]);

  // Keep fee currencies in sync with allowed currencies
  useEffect(() => {
    if (isOpen) {
      const allowed = isDifferentCurrency 
        ? Array.from(new Set([paymentCurrency, accountCurrency]))
        : [accountCurrency];
      
      setFees(prev => prev.map(f => {
        if (!allowed.includes(f.currency)) {
          return { ...f, currency: accountCurrency };
        }
        return f;
      }));
    }
  }, [isOpen, isDifferentCurrency, paymentCurrency, accountCurrency]);

  // Live Math calculations
  // 1. Calculate total fees directly in payment currency (Layer 3)
  let totalFeesInPaymentCurrency = 0;
  if (includeFees) {
    fees.forEach(f => {
      if (f.amount > 0) {
        if (f.currency.toUpperCase() === paymentCurrency.toUpperCase()) {
          totalFeesInPaymentCurrency += f.amount;
        } else if (f.currency.toUpperCase() === accountCurrency.toUpperCase()) {
          totalFeesInPaymentCurrency += conversionRate > 0 ? (f.amount / conversionRate) : 0;
        } else {
          const rate = getExchangeRate(f.currency, paymentCurrency);
          totalFeesInPaymentCurrency += f.amount * rate;
        }
      }
    });
  }

  // 2. Gross & Net in Payment Currency (Layer 3)
  const netAmountInPaymentCurrency = Math.max(0, grossAmount - totalFeesInPaymentCurrency);

  // 3. Gross, Net, and Fees in Base INR (Layer 1)
  const payCur = isDifferentCurrency ? paymentCurrency : accountCurrency;
  const paymentRateToBase = isDifferentCurrency ? (conversionRate * exchangeRateToBase) : exchangeRateToBase;
  const grossBase = grossAmount * paymentRateToBase;
  const netBase = netAmountInPaymentCurrency * paymentRateToBase;
  const totalFeesBase = totalFeesInPaymentCurrency * paymentRateToBase;

  // 4. Net in Account Currency (Layer 2)
  const netAmountInAccountCurrency = netAmountInPaymentCurrency * conversionRate;

  // 5. Calculate allocations in base INR (Layer 1) using exact displayed/locked snapshot rates
  let totalAllocatedBase = 0;
  if (allocateToInvoice) {
    allocations.forEach(alloc => {
      if (alloc.amount > 0 && alloc.rate > 0) {
        // Base amount in INR = (amount in Invoice Currency / rate) * exchangeRateToBase
        const allocBase = (alloc.amount / alloc.rate) * exchangeRateToBase;
        totalAllocatedBase += allocBase;
      }
    });
  }

  // 6. Compute Remaining and Allocated in Base INR, Payment Currency, and Account Currency
  const remainingBase = netBase - totalAllocatedBase;
  const remainingInPaymentCurrency = paymentRateToBase > 0 ? (remainingBase / paymentRateToBase) : 0;
  const remainingInAccountCurrency = exchangeRateToBase > 0 ? (remainingBase / exchangeRateToBase) : 0;
  const totalAllocatedInAccountCurrency = exchangeRateToBase > 0 ? (totalAllocatedBase / exchangeRateToBase) : 0;

  // Set default allocation rates when invoices or account currencies update
  const handleSelectInvoice = (idx: number, invId: string) => {
    updateAllocationRow(idx, { invoiceId: invId });
    const inv = projectsInvoices.find(i => i._id === invId);
    if (inv) {
      const invCurrency = (inv.currency || (inv.invoiceType === "usd" ? "USD" : "AED")).toUpperCase();
      fetchAllocationRate(idx, accountCurrency, invCurrency, invId);
    }
  };

  const addAllocationRow = () => {
    const unused = projectsInvoices.find(inv => !allocations.some(a => a.invoiceId === inv._id));
    const invId = unused?._id || (projectsInvoices[0]?._id ?? "");
    const inv = projectsInvoices.find(i => i._id === invId);
    const invCurrency = (inv?.currency || (inv?.invoiceType === "usd" ? "USD" : "AED")).toUpperCase();
    const defaultRate = getExchangeRate(accountCurrency, invCurrency);

    const newIdx = allocations.length;
    setAllocations(prev => [
      ...prev,
      {
        invoiceId: invId,
        amount: 0,
        rate: defaultRate,
      }
    ]);

    fetchAllocationRate(newIdx, accountCurrency, invCurrency, invId);
  };

  const removeAllocationRow = (index: number) => {
    setAllocations(prev => prev.filter((_, i) => i !== index));
  };

  const updateAllocationRow = (index: number, partial: Partial<{ invoiceId: string; amount: number; rate: number }>) => {
    setAllocations(prev => prev.map((row, i) => i === index ? { ...row, ...partial } : row));
  };

  const handleAutoAllocate = () => {
    if (projectsInvoices.length === 0 || netAmountInAccountCurrency <= 0) return;

    // Filter to active outstanding (unpaid/partial/overdue) invoices
    const unpaidInvoices = projectsInvoices.filter(inv => 
      inv.status !== "PAID" && inv.status !== "DRAFT" && inv.status !== "CANCELLED"
    );

    if (unpaidInvoices.length === 0) return;

    // Sort chronologically by due date ascending (oldest due first)
    const sorted = [...unpaidInvoices].sort((a, b) => {
      const dateA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
      const dateB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
      return dateA - dateB;
    });

    let pool = netAmountInAccountCurrency;
    const newAllocations: Array<{ invoiceId: string; amount: number; rate: number }> = [];

    for (const inv of sorted) {
      if (pool <= 0) break;

      const invCurrency = (inv.currency || (inv.invoiceType === "usd" ? "USD" : "AED")).toUpperCase();
      
      // Compute remaining unpaid balance in invoice currency
      const totalIntendedBase = inv.totalsCache?.totalIntendedBase ?? 0;
      const totalReceivedBase = inv.totalsCache?.totalReceivedBase ?? 0;
      const receivedInInvoiceCurrency = totalIntendedBase > 0 
        ? (totalReceivedBase / totalIntendedBase) * inv.total 
        : 0;
      const remainingInInvoiceCurrency = Math.max(0, inv.total - receivedInInvoiceCurrency);

      if (remainingInInvoiceCurrency <= 0.001) continue;

      const rate = getExchangeRate(accountCurrency, invCurrency);
      const remainingInAccountCurrency = remainingInInvoiceCurrency / rate;

      if (pool >= remainingInAccountCurrency) {
        newAllocations.push({
          invoiceId: inv._id,
          amount: parseFloat(remainingInInvoiceCurrency.toFixed(4)),
          rate,
        });
        pool -= remainingInAccountCurrency;
      } else {
        const amountInInvoiceCurrency = pool * rate;
        newAllocations.push({
          invoiceId: inv._id,
          amount: parseFloat(amountInInvoiceCurrency.toFixed(4)),
          rate,
        });
        pool = 0;
      }
    }

    if (newAllocations.length > 0) {
      setAllocateToInvoice(true);
      setAllocations(newAllocations);
    }
  };

  // Fees management
  const addFeeRow = () => {
    setFees(prev => [...prev, { title: "", amount: 0, currency: paymentCurrency, category: "GATEWAY_FEE" }]);
  };

  const removeFeeRow = (index: number) => {
    setFees(prev => prev.filter((_, i) => i !== index));
  };

  const updateFeeRow = (index: number, partial: Partial<(typeof fees)[0]>) => {
    setFees(prev => prev.map((row, i) => i === index ? { ...row, ...partial } : row));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return setError("Please select a project.");
    if (!accountId) return setError("Please select an account.");
    if (grossAmount <= 0) return setError("Please enter an amount received greater than 0.");
    if (conversionRate <= 0) return setError("Conversion rate must be greater than 0.");
    if (exchangeRateToBase <= 0) return setError("Exchange rate to base must be greater than 0.");

    if (remainingInAccountCurrency < -0.01) {
      return setError(`Allocation error: Overallocation of ${Math.abs(remainingInAccountCurrency).toFixed(2)} ${accountCurrency} detected.`);
    }

    if (allocateToInvoice) {
      if (allocations.length === 0) {
        return setError("Please add at least one allocation or uncheck allocation toggle.");
      }
      for (let i = 0; i < allocations.length; i++) {
        if (!allocations[i].invoiceId) {
          return setError(`Allocation Row ${i + 1}: Please select a valid invoice.`);
        }
        if (allocations[i].amount <= 0) {
          return setError(`Allocation Row ${i + 1}: Allocation amount must be greater than 0.`);
        }
        if (allocations[i].rate <= 0) {
          return setError(`Allocation Row ${i + 1}: Allocation conversion rate must be greater than 0.`);
        }
      }
    }
    
    setSubmitting(true);
    setError("");

    try {
      const mappedAllocations = allocateToInvoice
        ? allocations
            .filter(a => a.invoiceId && a.amount > 0)
            .map(a => {
              const matchingInvoice = projectsInvoices.find(inv => inv._id === a.invoiceId);
              const invoiceCurrency = (matchingInvoice?.currency || (matchingInvoice?.invoiceType === "usd" ? "USD" : "AED")).toUpperCase();
              return {
                invoiceId: a.invoiceId,
                amount: Number(a.amount),
                rate: Number(a.rate),
                rateToBase: STATIC_FX_RATES[invoiceCurrency] || 22.6
              };
            })
        : [];

      let clientId = "";
      if (mappedAllocations.length > 0) {
        const matchingInvoice = projectsInvoices.find(inv => inv._id === mappedAllocations[0].invoiceId);
        clientId = matchingInvoice?.clientId || "";
      }
      if (!clientId && projectsInvoices.length > 0) {
        clientId = projectsInvoices[0].clientId || "";
      }

      const payload = {
        projectId,
        accountId,
        clientId,
        amount: Number(netAmountInAccountCurrency), // Net deposited amount
        currency: accountCurrency,
        exchangeRateToBase: Number(exchangeRateToBase),
        method,
        type,
        referenceNumber,
        note,
        paymentCurrency,
        paymentAmountGross: Number(grossAmount),
        paymentAmountNet: Number(netAmountInPaymentCurrency),
        feeAmount: Number(totalFeesInPaymentCurrency * conversionRate),
        fees: fees
          .filter(f => f.amount > 0)
          .map(f => ({
            type: f.category,
            label: f.title || f.category.replace("_", " "),
            amount: Number(f.amount),
            currency: f.currency,
            note: f.title
          })),
        allocations: mappedAllocations,
      };

      await apiFetch(`${apiPrefix}/payments`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to record payment");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[600px] bg-card rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 border-b bg-muted/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary ring-1 ring-primary/20">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Record Payment</h2>
              <p className="text-xs text-muted-foreground">Manage project revenues, forex, fees and allocations</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6">
          <form id="record-payment-form" onSubmit={handleSubmit} className="space-y-6">
            
            {error && (
              <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-semibold flex items-center gap-2 animate-shake">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* 1. Project Context */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">1. Project Context</Label>
              <ProjectSearchPicker value={projectId} onChange={setProjectId} />
            </div>

            {/* 2. Receiving Account */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">2. Receiving Account</Label>
                {loadingAccounts ? (
                  <div className="h-10 rounded-lg bg-muted/20 border border-border/80 flex items-center justify-center">
                    <Loader2 className="w-4 h-4 animate-spin text-primary/40" />
                  </div>
                ) : (
                  <Select 
                    value={accountId} 
                    onChange={e => setAccountId(e.target.value)}
                    options={accounts.map(a => ({ value: a._id, label: `${a.name} (${a.currency})` }))}
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Payment Method</Label>
                <Select 
                  value={method} 
                  onChange={e => setMethod(e.target.value)}
                  options={[
                    { value: "BANK_TRANSFER", label: "Bank Transfer" },
                    { value: "STRIPE", label: "Stripe" },
                    { value: "PAYPAL", label: "PayPal" },
                    { value: "WISE", label: "Wise" },
                    { value: "UPI", label: "UPI" },
                    { value: "CASH", label: "Cash" },
                  ]}
                />
              </div>
            </div>

            {/* 3. Payment Currency / Forex Section */}
            <div className="space-y-4 pt-4 border-t border-dashed border-border/80">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">3. Payment Currency</Label>
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="differentCurrency" 
                    checked={isDifferentCurrency} 
                    onChange={e => setIsDifferentCurrency(e.target.checked)} 
                    className="rounded border-border cursor-pointer size-4 text-primary focus:ring-primary"
                  />
                  <Label htmlFor="differentCurrency" className="text-xs cursor-pointer select-none font-semibold text-primary">
                    Payment in different currency
                  </Label>
                </div>
              </div>

              {isDifferentCurrency ? (
                <div className="p-4 bg-muted/10 rounded-xl border border-border/80 space-y-4 animate-in slide-in-from-top-2 duration-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">From Currency</Label>
                      <Select 
                        value={paymentCurrency}
                        onValueChange={val => setPaymentCurrency(val)}
                        options={SUPPORTED_CURRENCIES.map(c => ({
                          value: c.value,
                          label: c.label,
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">To Currency (Locked)</Label>
                      <div className="h-10 bg-muted/20 border border-border/80 rounded-lg flex items-center px-3 text-sm font-semibold text-muted-foreground">
                        <Lock className="w-3.5 h-3.5 mr-2 text-muted-foreground/60" />
                        {accountCurrency}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Gross Amount Received ({paymentCurrency})</Label>
                      <Input 
                        type="number" 
                        step="0.01" 
                        placeholder="0.00"
                        value={grossAmount || ""}
                        onChange={e => setGrossAmount(Number(e.target.value))} 
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Conversion Rate ({paymentCurrency} &rarr; {accountCurrency})</Label>
                         {fetchingLiveRate ? (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Loader2 className="w-2.5 h-2.5 animate-spin text-primary" /> Fetching...
                          </span>
                        ) : isManualRate ? (
                          <span className="text-[10px] text-amber-500 font-semibold">Custom Override</span>
                        ) : isRateLive ? (
                          <span className="text-[10px] text-green-500 font-semibold flex items-center gap-0.5">
                            <CheckCircle2 className="w-2.5 h-2.5 text-green-500" /> Live Rate Loaded
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-600 font-semibold flex items-center gap-0.5 bg-amber-500/5 border border-amber-500/20 px-1.5 py-0.5 rounded" title="Outbound server timeout: Loaded fallback static rate.">
                            <AlertTriangle className="w-2.5 h-2.5 text-amber-600" /> Offline Rate Loaded
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Input 
                          type="number" 
                          step="0.0001" 
                          placeholder="1.0000"
                          className="flex-1"
                          value={conversionRate || ""}
                          onChange={e => {
                            setConversionRate(Number(e.target.value));
                            setIsManualRate(true);
                          }} 
                        />
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="icon" 
                          className="h-10 w-10 shrink-0 border-border hover:bg-muted/50 text-muted-foreground hover:text-primary transition-colors" 
                          title="Auto Load Live Exchange Rate"
                          onClick={() => fetchLiveExchangeRates(paymentCurrency, accountCurrency, true)}
                          disabled={fetchingLiveRate}
                        >
                          <TrendingUp className={`w-4 h-4 ${fetchingLiveRate ? 'animate-spin text-muted-foreground' : 'text-primary'}`} />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="text-xs">Gross Amount Received ({accountCurrency})</Label>
                  <Input 
                    type="number" 
                    step="0.01" 
                    placeholder="0.00"
                    value={grossAmount || ""}
                    onChange={e => setGrossAmount(Number(e.target.value))} 
                  />
                </div>
              )}

              {/* Extra Exchange Rate Field to Base if receiving in a foreign account */}
              {accountCurrency !== "INR" && (
                <div className="p-3.5 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                    <Calculator className="w-4 h-4 text-amber-600" />
                    Aggregated Base Treasury Settings
                  </div>
                  <div className="grid grid-cols-2 gap-3 items-center">
                    <div className="space-y-1">
                      <Label className="text-xs text-amber-600/80">Exchange Rate ({accountCurrency} &rarr; INR)</Label>
                      {isManualBaseRate ? (
                        <p className="text-[9px] text-amber-500 font-semibold">Custom Override</p>
                      ) : isBaseRateLive ? (
                        <p className="text-[9px] text-green-600 font-semibold flex items-center gap-0.5">
                          <CheckCircle2 className="w-2.5 h-2.5 text-green-600" /> Live Rate Loaded
                        </p>
                      ) : (
                        <p className="text-[9px] text-amber-600 font-semibold flex items-center gap-0.5" title="Outbound server timeout: Loaded fallback static rate.">
                          <AlertTriangle className="w-2.5 h-2.5 text-amber-600" /> Offline Rate Loaded
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1.5">
                      <Input 
                        type="number" 
                        step="0.0001"
                        className="h-8 text-xs border-amber-500/30 flex-1 bg-background"
                        value={exchangeRateToBase || ""}
                        onChange={e => {
                          setExchangeRateToBase(Number(e.target.value));
                          setIsManualBaseRate(true);
                        }} 
                      />
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="icon" 
                        className="h-8 w-8 shrink-0 border-amber-500/30 hover:bg-amber-500/10 text-amber-700" 
                        title="Auto Load Live Base Rate"
                        onClick={() => fetchLiveBaseRate(accountCurrency, true)}
                      >
                        <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 4. Fees / Charges System */}
            <div className="space-y-4 pt-4 border-t border-dashed border-border/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="includeFees" 
                    checked={includeFees} 
                    onChange={e => setIncludeFees(e.target.checked)} 
                    className="rounded border-border cursor-pointer size-4 text-primary focus:ring-primary"
                  />
                  <Label htmlFor="includeFees" className="cursor-pointer font-bold text-xs uppercase tracking-wider text-muted-foreground select-none">
                    4. Fees &amp; Deductions System
                  </Label>
                </div>
              </div>
              
              {includeFees && (
                <div className="space-y-3 bg-muted/10 p-4 rounded-xl border border-border/80 animate-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Fee / Tax Breakdown</span>
                    <Button 
                      type="button" 
                      size="sm" 
                      variant="outline" 
                      className="h-7 text-xs px-2.5 gap-1 border-dashed hover:bg-muted/50"
                      onClick={addFeeRow}
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Fee Item
                    </Button>
                  </div>
                  
                  {fees.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4 bg-background/30 rounded-lg border border-dashed border-border/40">
                      No fee items added yet. Click "+ Add Fee Item" to add Stripe fees, TDS, etc.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {fees.map((fee, idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-2 bg-background/50 p-2 rounded-lg border border-border/40 items-center relative animate-in fade-in duration-100">
                          <div className="col-span-4">
                            <Input 
                              required
                              placeholder="Title (e.g. Stripe Fee)" 
                              className="h-8 text-xs"
                              value={fee.title}
                              onChange={e => updateFeeRow(idx, { title: e.target.value })}
                            />
                          </div>
                          <div className="col-span-3">
                            <Input 
                              required
                              type="number" 
                              step="0.01" 
                              placeholder="Amount" 
                              className="h-8 text-xs"
                              value={fee.amount || ""}
                              onChange={e => updateFeeRow(idx, { amount: Number(e.target.value) })}
                            />
                          </div>
                          <div className="col-span-2">
                            <Select 
                              value={fee.currency}
                              onValueChange={val => updateFeeRow(idx, { currency: val })}
                              options={(isDifferentCurrency 
                                ? Array.from(new Set([paymentCurrency, accountCurrency]))
                                : [accountCurrency]
                              ).map(cur => ({ value: cur, label: cur }))}
                            />
                          </div>
                          <div className="col-span-2">
                            <Select 
                              value={fee.category}
                              onValueChange={val => updateFeeRow(idx, { category: val as any })}
                              options={[
                                { value: "GATEWAY_FEE", label: "Gateway" },
                                { value: "TDS", label: "TDS" },
                                { value: "BANK_CHARGE", label: "Bank" },
                                { value: "FOREX", label: "Forex" },
                                { value: "GST_ON_FEE", label: "GST" },
                                { value: "OTHER", label: "Other" },
                              ]}
                            />
                          </div>
                          <div className="col-span-1 text-center">
                            <button 
                              type="button" 
                              onClick={() => removeFeeRow(idx)}
                              className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 5. Invoice Allocation (strictly in accountCurrency) */}
            <div className="space-y-4 pt-4 border-t border-dashed border-border/80">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">5. Invoice Allocation</Label>
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="allocate" 
                    checked={allocateToInvoice} 
                    disabled={!projectId}
                    onChange={e => {
                      setAllocateToInvoice(e.target.checked);
                      if (e.target.checked && allocations.length === 0 && projectsInvoices.length > 0) {
                        const inv = projectsInvoices[0];
                        const invCurrency = (inv.currency || (inv.invoiceType === "usd" ? "USD" : "AED")).toUpperCase();
                        const defaultRate = getExchangeRate(accountCurrency, invCurrency);
                        setAllocations([{ invoiceId: inv._id, amount: 0, rate: defaultRate }]);
                        fetchAllocationRate(0, accountCurrency, invCurrency, inv._id);
                      }
                    }} 
                  />
                  <Label htmlFor="allocate" className={`text-xs cursor-pointer select-none font-semibold ${!projectId ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    Allocate funds now? {!projectId && <span className="text-[10px] text-destructive font-medium">(Select project first)</span>}
                  </Label>
                </div>
              </div>
              
              {allocateToInvoice && projectId && (
                <div className="space-y-4">
                  {projectsInvoices.length > 0 && netAmountInAccountCurrency > 0 && (
                    <div className="flex items-center justify-between bg-primary/5 border border-primary/20 px-3.5 py-2.5 rounded-xl animate-in slide-in-from-top-2">
                      <div className="flex flex-col gap-0.5 pr-2">
                        <span className="text-xs font-bold text-primary flex items-center gap-1.5 select-none">
                          ✨ Smart FIFO Auto-Allocation
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          Chronologically allocate {netAmountInAccountCurrency.toFixed(2)} {accountCurrency} across your outstanding invoices in one click.
                        </span>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-sm shadow-primary/20 shrink-0 h-8 text-xs rounded-lg animate-pulse hover:animate-none"
                        onClick={handleAutoAllocate}
                      >
                        Auto-Allocate
                      </Button>
                    </div>
                  )}

                  {loadingInvoices ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground py-2 justify-center">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading project invoices...
                    </div>
                  ) : projectsInvoices.length === 0 ? (
                    <p className="text-xs text-amber-500 font-semibold py-3 bg-amber-500/5 rounded-xl border border-amber-500/20 text-center">
                      No active invoices found for this project.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {allocations.map((row, idx) => {
                        const matchingInvoice = projectsInvoices.find(inv => inv._id === row.invoiceId);
                        const invoiceCurrency = (matchingInvoice?.currency || (matchingInvoice?.invoiceType === "usd" ? "USD" : "AED")).toUpperCase();
                        return (
                          <div key={idx} className="p-4 bg-muted/20 rounded-xl border border-border/80 space-y-3.5 relative animate-in slide-in-from-top-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-primary">Invoice Allocation #{idx + 1}</span>
                              {allocations.length > 1 && (
                                <button 
                                  type="button" 
                                  onClick={() => removeAllocationRow(idx)}
                                  className="text-xs text-destructive hover:underline font-semibold"
                                >
                                  Remove Row
                                </button>
                              )}
                            </div>
                            
                            <div className="space-y-2">
                              <Label className="text-xs">Select Invoice</Label>
                              <Select 
                                value={row.invoiceId} 
                                onChange={e => handleSelectInvoice(idx, e.target.value)}
                                options={projectsInvoices.map(i => {
                                  const currencySymbol = (i.currency || (i.invoiceType === "usd" ? "USD" : "AED")).toUpperCase();
                                  return { 
                                    value: i._id, 
                                    label: `${i.invoiceNumber} (${currencySymbol} ${(i.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}) - ${i.status}` 
                                  };
                                })}
                              />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label className="text-xs">Amount to Allocate ({invoiceCurrency})</Label>
                                <Input 
                                  type="number" 
                                  step="0.01" 
                                  value={row.amount || ""} 
                                  placeholder="0.00"
                                  onChange={e => updateAllocationRow(idx, { amount: Number(e.target.value) })} 
                                />
                              </div>
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <Label className="text-xs">Conversion Rate ({accountCurrency} &rarr; {invoiceCurrency})</Label>
                                  <span className="text-[9px] text-primary/80 font-bold flex items-center gap-0.5 bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10 select-none">
                                    <Lock className="w-2 h-2" /> Same-day Locked
                                  </span>
                                </div>
                                <div className="relative">
                                  <Input 
                                    disabled 
                                    className="bg-muted/30 border-border/60 pr-8 font-semibold text-muted-foreground cursor-not-allowed select-none"
                                    type="text" 
                                    value={formatHumanRate(row.rate || 1.0, accountCurrency, invoiceCurrency)} 
                                    placeholder="1.00"
                                  />
                                  <Lock className="w-3.5 h-3.5 text-muted-foreground/60 absolute right-3 top-1/2 -translate-y-1/2" />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      
                      {allocations.length < projectsInvoices.length && (
                        <Button 
                          type="button" 
                          size="sm" 
                          variant="outline" 
                          className="w-full border-dashed"
                          onClick={addAllocationRow}
                        >
                          + Allocate Another Invoice
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 6. Notes & Reference */}
            <div className="space-y-4 pt-4 border-t border-dashed border-border/80">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">6. Transaction References</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Reference Number / Transaction ID</Label>
                  <Input 
                    placeholder="e.g. TXN-198273"
                    value={referenceNumber}
                    onChange={e => setReferenceNumber(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Note</Label>
                  <Input 
                    placeholder="Payment receipt note..."
                    value={note}
                    onChange={e => setNote(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Zoho/QuickBooks Premium Live Summary Card */}
            {grossAmount > 0 && (
              <div className="p-6 rounded-2xl bg-gradient-to-br from-zinc-900/50 to-zinc-950/50 backdrop-blur-md border border-border/80 shadow-2xl space-y-5 animate-in fade-in duration-300">
                <div className="flex items-center justify-between border-b border-border/40 pb-2">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <Calculator className="w-4 h-4 text-primary animate-pulse" />
                    Treasury Money Flow Summary
                  </h3>
                  <span className="text-[9px] font-bold text-green-600 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20 uppercase tracking-wider select-none">
                    Normalized Base: INR
                  </span>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 items-center">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                      Gross Received
                      <span className="cursor-help text-muted-foreground/60" title="The total amount of funds collected from the client in the original payment currency.">
                        <Info className="w-3 h-3" />
                      </span>
                    </div>
                    <p className="text-lg font-extrabold text-foreground tabular-nums">
                      {grossAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-xs text-muted-foreground font-medium">{paymentCurrency}</span>
                    </p>
                  </div>
                  
                  {includeFees && totalFeesInPaymentCurrency > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-[10px] text-red-500 font-semibold uppercase tracking-wider">
                        Total Deductions
                        <span className="cursor-help text-red-500/60" title="All transaction fees, gateway charges, TDS, or local taxes normalized and deducted.">
                          <Info className="w-3 h-3" />
                        </span>
                      </div>
                      <p className="text-lg font-extrabold text-red-500/90 tabular-nums">
                        -{totalFeesInPaymentCurrency.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-xs text-muted-foreground font-medium">{paymentCurrency}</span>
                      </p>
                    </div>
                  )}

                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-[10px] text-green-500 font-semibold uppercase tracking-wider">
                      Net Converted
                      <span className="cursor-help text-green-500/60" title="The net amount normalized to base and converted into the receiving account's currency.">
                        <Info className="w-3 h-3" />
                      </span>
                    </div>
                    <p className="text-lg font-extrabold text-green-500 tabular-nums">
                      {netAmountInAccountCurrency.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-xs text-muted-foreground font-medium">{accountCurrency}</span>
                    </p>
                  </div>
                </div>

                {allocateToInvoice && (
                  <div className="pt-4 border-t border-border/40 grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                        Allocated
                        <span className="cursor-help text-muted-foreground/60" title="The sum of funds currently assigned to active project invoices.">
                          <Info className="w-3 h-3" />
                        </span>
                      </div>
                      <p className="text-base font-bold text-foreground tabular-nums">
                        {totalAllocatedInAccountCurrency.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-xs text-muted-foreground font-medium">{accountCurrency}</span>
                      </p>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                        Remaining
                        <span className="cursor-help text-muted-foreground/60" title="Unallocated amount. Zero indicates perfect book balance. Positive values log as client credit.">
                          <Info className="w-3 h-3" />
                        </span>
                      </div>
                      <p className={`text-base font-bold tabular-nums ${
                        remainingInAccountCurrency < -0.01 
                          ? "text-destructive" 
                          : remainingInAccountCurrency > 0.01 
                          ? "text-amber-500" 
                          : "text-green-500"
                      }`}>
                        {remainingInAccountCurrency.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-xs font-medium">{accountCurrency}</span>
                      </p>
                    </div>
                  </div>
                )}

                {/* VISUAL MONEY FLOW JOURNEY - EXTREMELY HIGH PREMIUM FINTECH UX */}
                <div className="mt-2 p-3.5 bg-zinc-950/40 rounded-xl border border-border/40 space-y-2.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-primary" />
                    Interactive Ledger Flow Map
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground bg-muted/40 px-2 py-0.5 rounded border border-border/60">
                      {grossAmount.toFixed(2)} {paymentCurrency}
                    </span>
                    <span className="text-muted-foreground/40">&rarr;</span>
                    
                    {includeFees && totalFeesInPaymentCurrency > 0 && (
                      <>
                        <span className="text-red-400 bg-red-950/30 px-2 py-0.5 rounded border border-red-500/20">
                          -{totalFeesInPaymentCurrency.toFixed(2)} {paymentCurrency} (Fees)
                        </span>
                        <span className="text-muted-foreground/40">&rarr;</span>
                      </>
                    )}

                    <span className="font-semibold text-green-400 bg-green-950/30 px-2 py-0.5 rounded border border-green-500/20">
                      {netAmountInAccountCurrency.toFixed(2)} {accountCurrency} (Net)
                    </span>

                    {allocateToInvoice && totalAllocatedInAccountCurrency > 0 && (
                      <>
                        <span className="text-muted-foreground/40">&rarr;</span>
                        <span className="font-semibold text-blue-400 bg-blue-950/30 px-2 py-0.5 rounded border border-blue-500/20">
                          {totalAllocatedInAccountCurrency.toFixed(2)} {accountCurrency} (Allocated)
                        </span>
                      </>
                    )}

                    {allocateToInvoice && remainingInAccountCurrency > 0.01 && (
                      <>
                        <span className="text-muted-foreground/40">&rarr;</span>
                        <span className="font-semibold text-amber-400 bg-amber-950/30 px-2 py-0.5 rounded border border-amber-500/20" title="Logged to Client account credit.">
                          +{remainingInAccountCurrency.toFixed(2)} {accountCurrency} (Credit)
                        </span>
                      </>
                    )}
                  </div>
                </div>
                {/* Info & Warning Badges */}
                <div className="pt-2">
                  {remainingInAccountCurrency < -0.01 ? (
                    <div className="p-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-xs font-semibold text-destructive flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" />
                      Overallocated by {Math.abs(remainingInAccountCurrency).toFixed(2)} {accountCurrency}! Please lower allocation amounts.
                    </div>
                  ) : remainingInAccountCurrency > 0.01 ? (
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-600 flex items-center gap-1.5">
                      <Info className="w-4 h-4" />
                      Unallocated remainder of {remainingInAccountCurrency.toFixed(2)} {accountCurrency} will be logged as client account credit.
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-green-500/10 border border-green-500/20 text-xs font-semibold text-green-600 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      All payment funds are perfectly matched and allocated.
                    </div>
                  )}
                </div>
              </div>
            )}

            {submitting && (
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-2.5 animate-pulse mt-4">
                <div className="flex items-center gap-2.5">
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  <span className="text-xs font-bold text-foreground">🔒 Securing Ledger &amp; Verifying Idempotency...</span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-normal pl-6">
                  Establishing safe transaction handshake. WTS-FinCore double-charge guards are fully active to lock ledger safety.
                </p>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-muted/10 flex items-center justify-end gap-3 shrink-0">
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button form="record-payment-form" type="submit" disabled={submitting} className="min-w-[150px]">
            {submitting ? (
              <span className="flex items-center gap-1.5 justify-center">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Processing...
              </span>
            ) : "Record Transaction"}
          </Button>
        </div>
      </div>
    </div>
  );
}
