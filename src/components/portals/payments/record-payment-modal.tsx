"use client";

import { useState, useEffect } from "react";
import { X, CreditCard, Loader2, Calculator, Lock, Unlock, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ProjectSearchPicker } from "@/components/portals/project-search-picker";
import { apiFetch } from "@/lib/api/client";
import { SUPPORTED_CURRENCIES } from "@/lib/constants/finance";

export type InvoiceRow = {
  _id: string;
  invoiceNumber: string;
  total: number;
  currency: string;
  status: string;
  companyId?: string;
  projectId?: string;
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
  const [currency, setCurrency] = useState("USD");
  const [exchangeRateToBase, setExchangeRateToBase] = useState(83.5);
  const [amount, setAmount] = useState(0);
  const [feeAmount, setFeeAmount] = useState(0);
  
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
          if (res.items?.length > 0 && !accountId) setAccountId(res.items[0]._id);
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

  const addAllocationRow = () => {
    const unused = projectsInvoices.find(inv => !allocations.some(a => a.invoiceId === inv._id));
    setAllocations(prev => [
      ...prev,
      {
        invoiceId: unused?._id || (projectsInvoices[0]?._id ?? ""),
        amount: 0,
        rate: 1,
      }
    ]);
  };

  const removeAllocationRow = (index: number) => {
    setAllocations(prev => prev.filter((_, i) => i !== index));
  };

  const updateAllocationRow = (index: number, partial: Partial<{ invoiceId: string; amount: number; rate: number }>) => {
    setAllocations(prev => prev.map((row, i) => i === index ? { ...row, ...partial } : row));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return setError("Please select a project.");
    if (!accountId) return setError("Please select an account.");

    if (allocateToInvoice) {
      if (allocations.length === 0) {
        return setError("Please add at least one allocation or uncheck 'Allocate funds now?'.");
      }
      for (let i = 0; i < allocations.length; i++) {
        if (!allocations[i].invoiceId) {
          return setError(`Row ${i + 1}: Please select a valid invoice.`);
        }
        if (allocations[i].amount <= 0) {
          return setError(`Row ${i + 1}: Allocation amount must be greater than 0.`);
        }
      }
    }
    
    setSubmitting(true);
    setError("");

    try {
      const selectedAccount = accounts.find(a => a._id === accountId);
      const mappedAllocations = allocateToInvoice
        ? allocations
            .filter(a => a.invoiceId && a.amount > 0)
            .map(a => ({
              invoiceId: a.invoiceId,
              amount: Number(a.amount),
              rate: Number(a.rate),
            }))
        : [];

      let clientId = "";
      if (mappedAllocations.length > 0) {
        const matchingInvoice = projectsInvoices.find(inv => inv._id === mappedAllocations[0].invoiceId);
        clientId = (matchingInvoice as any)?.clientId || "";
      }
      if (!clientId && projectsInvoices.length > 0) {
        clientId = (projectsInvoices[0] as any)?.clientId || "";
      }

      const payload = {
        projectId,
        accountId,
        clientId,
        amount: Number(amount),
        currency: selectedAccount?.currency || currency,
        exchangeRateToBase: Number(exchangeRateToBase),
        feeAmount: Number(feeAmount),
        method,
        type,
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
      <div className="relative w-full max-w-[550px] bg-card rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-5 border-b bg-muted/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary ring-1 ring-primary/20">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Record Payment</h2>
              <p className="text-sm text-muted-foreground">Manage project revenue and allocations</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          <form id="record-payment-form" onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">1. Project Context</Label>
                <ProjectSearchPicker value={projectId} onChange={setProjectId} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">2. Receiving Account</Label>
                  <Select 
                    value={accountId} 
                    onChange={e => setAccountId(e.target.value)}
                    options={accounts.map(a => ({ value: a._id, label: `${a.name} (${a.currency})` }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Method</Label>
                  <Select 
                    value={method} 
                    onChange={e => setMethod(e.target.value)}
                    options={[
                      { value: "BANK_TRANSFER", label: "Bank Transfer" },
                      { value: "STRIPE", label: "Stripe" },
                      { value: "PAYPAL", label: "PayPal" },
                      { value: "WISE", label: "Wise" },
                      { value: "CASH", label: "Cash" },
                    ]}
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-dashed">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">3. Payment Details</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Net Amount Received</Label>
                    <Input type="number" step="0.01" value={amount} onChange={e => setAmount(Number(e.target.value))} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Exchange Rate (to INR)</Label>
                    <Input type="number" step="0.0001" value={exchangeRateToBase} onChange={e => setExchangeRateToBase(Number(e.target.value))} />
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-dashed">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">4. Invoice Allocation</Label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="allocate" 
                      checked={allocateToInvoice} 
                      disabled={!projectId}
                      onChange={e => {
                        setAllocateToInvoice(e.target.checked);
                        if (e.target.checked && allocations.length === 0 && projectsInvoices.length > 0) {
                          setAllocations([{ invoiceId: projectsInvoices[0]._id, amount: 0, rate: 1 }]);
                        }
                      }} 
                    />
                    <Label htmlFor="allocate" className={`text-xs cursor-pointer ${!projectId ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      Allocate funds now? {!projectId && <span className="text-[10px] text-destructive font-medium">(Select project first)</span>}
                    </Label>
                  </div>
                </div>
                
                {allocateToInvoice && projectId && (
                  <div className="space-y-4">
                    {loadingInvoices ? (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground py-2 justify-center">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading project invoices...
                      </div>
                    ) : projectsInvoices.length === 0 ? (
                      <p className="text-xs text-amber-500 font-semibold py-2 bg-amber-500/5 rounded-xl border border-amber-500/20 text-center">
                        No invoices found for this project. Create an invoice first, or record this as an unallocated payment.
                      </p>
                    ) : (
                      <div className="space-y-3.5">
                        {allocations.map((row, idx) => {
                          const matchingInvoice = projectsInvoices.find(inv => inv._id === row.invoiceId);
                          const invoiceCurrency = matchingInvoice?.currency || "AED";
                          return (
                            <div key={idx} className="p-4 bg-muted/20 rounded-xl border border-border/80 space-y-3 relative animate-in slide-in-from-top-2">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs font-bold text-primary">Allocation #{idx + 1}</Label>
                                {allocations.length > 1 && (
                                  <button 
                                    type="button" 
                                    onClick={() => removeAllocationRow(idx)}
                                    className="text-xs text-destructive hover:underline font-semibold"
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>
                              
                              <div className="space-y-2">
                                <Label className="text-xs">Select Invoice</Label>
                                <Select 
                                  value={row.invoiceId} 
                                  onChange={e => updateAllocationRow(idx, { invoiceId: e.target.value })}
                                  options={projectsInvoices.map(i => ({ 
                                    value: i._id, 
                                    label: `${i.invoiceNumber} (${i.currency} ${(i.total || 0).toFixed(2)}) - ${i.status}` 
                                  }))}
                                />
                              </div>
                              
                              <div className="grid grid-cols-2 gap-3.5">
                                <div className="space-y-2">
                                  <Label className="text-xs">Amount ({invoiceCurrency})</Label>
                                  <Input 
                                    type="number" 
                                    step="0.01" 
                                    value={row.amount || ""} 
                                    placeholder="0.00"
                                    onChange={e => updateAllocationRow(idx, { amount: Number(e.target.value) })} 
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-xs">Pay Rate (Acc &rarr; Inv)</Label>
                                  <Input 
                                    type="number" 
                                    step="0.0001" 
                                    value={row.rate || ""} 
                                    placeholder="1.00"
                                    onChange={e => updateAllocationRow(idx, { rate: Number(e.target.value) })} 
                                  />
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
                            + Connect Another Invoice
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>

        <div className="px-6 py-4 border-t bg-muted/10 flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button form="record-payment-form" type="submit" disabled={submitting}>
            {submitting ? "Saving..." : "Record Transaction"}
          </Button>
        </div>
      </div>
    </div>
  );
}
