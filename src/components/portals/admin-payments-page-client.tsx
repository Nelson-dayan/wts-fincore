"use client";

import { useState, useEffect } from "react";
import { Plus, X, Lock, Unlock, CreditCard, RotateCcw, Loader2, Calculator } from "lucide-react";
import { ResourceTableClient } from "@/components/portals/resource-table-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ProjectSearchPicker } from "@/components/portals/project-search-picker";
import { InvoiceRow, InvoiceSearchPicker } from "@/components/portals/invoice-search-picker";

import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { usePortalConfig } from "@/components/portals/portal-config-context";
import { PaymentDetailModal } from "@/components/portals/payment-detail-modal";
import { InvoiceLedgerModal } from "@/components/portals/invoice-ledger-modal";

type FeeRow = { type: string; amount: number };

export function AdminPaymentsPageClient({ apiPrefix }: { apiPrefix: string }) {
  const { pathPrefix } = usePortalConfig();
  const [modalOpen, setModalOpen] = useState(false);
  const [viewingPaymentId, setViewingPaymentId] = useState<string | null>(null);
  const [viewingLedgerInvoiceId, setViewingLedgerInvoiceId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Form State
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [projectInvoices, setProjectInvoices] = useState<InvoiceRow[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRow | null>(null);
  const [type, setType] = useState("PAYMENT");
  const [method, setMethod] = useState("BANK_TRANSFER");
  const [currency, setCurrency] = useState("USD");
  const [exchangeRate, setExchangeRate] = useState(83.5);
  const [intendedAmount, setIntendedAmount] = useState(0);
  const [receivedAmount, setReceivedAmount] = useState(0);
  const [fees, setFees] = useState<FeeRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [defaultRates, setDefaultRates] = useState<{ usdToInr: number; aedToInr: number; isLocked: boolean }>({
    usdToInr: 83.5,
    aedToInr: 22.7,
    isLocked: false,
  });

  useEffect(() => {
    if (modalOpen) {
      fetch(`${apiPrefix}/company`)
        .then((res) => res.json())
        .then((data) => {
          if (data?.item?.defaultExchangeRates) {
            setDefaultRates({
              usdToInr: data.item.defaultExchangeRates.usdToInr ?? 83.5,
              aedToInr: data.item.defaultExchangeRates.aedToInr ?? 22.7,
              isLocked: data.item.defaultExchangeRates.isLocked ?? false,
            });
          }
        })
        .catch(console.error);
    } else {
      // Reset when closed
      setSelectedProjectId("");
      setProjectInvoices([]);
      setSelectedInvoice(null);
      setType("PAYMENT");
      setIntendedAmount(0);
      setReceivedAmount(0);
      setFees([]);
      setError("");
    }
  }, [modalOpen, apiPrefix]);

  const handleProjectSelect = async (projectId: string) => {
    setSelectedProjectId(projectId);
    setSelectedInvoice(null);
    setProjectInvoices([]);
    
    if (!projectId) return;

    setInvoicesLoading(true);
    try {
      const qs = new URLSearchParams({ page: "1", limit: "50", projectId });
      const res = await fetch(`${apiPrefix}/invoices?${qs.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (res.ok && data.items) {
        setProjectInvoices(data.items);
      }
    } catch (err) {
      console.error("Failed to fetch invoices", err);
    } finally {
      setInvoicesLoading(false);
    }
  };

  const handleInvoiceSelect = (invId: string) => {
    const inv = projectInvoices.find((i) => String(i._id) === invId) || null;
    setSelectedInvoice(inv);
    if (inv) {
      const invCurrency = inv.invoiceType === "usd" ? "USD" : "AED";
      setCurrency(invCurrency);
      
      // Load default rate for the new currency
      const newRate = invCurrency === "USD" ? defaultRates.usdToInr : defaultRates.aedToInr;
      setExchangeRate(newRate);

      // Auto-fill remaining balance if possible
      if (inv.total) {
        const invExchangeRate = inv.exchangeRate || 1;
        const totalIntendedBase = inv.totalsCache?.totalIntendedBase || 0;
        const invoiceTotalBase = inv.total * invExchangeRate;
        const remainingBase = Math.max(0, invoiceTotalBase - totalIntendedBase);
        const remainingOriginal = Math.round((remainingBase / invExchangeRate) * 100) / 100;
        
        if (remainingOriginal > 0) {
          setIntendedAmount(remainingOriginal);
          setReceivedAmount(remainingOriginal);
        } else {
          setIntendedAmount(inv.total);
          setReceivedAmount(inv.total);
        }
      }
    }
  };

  const handleCurrencyChange = (newCurrency: string) => {
    setCurrency(newCurrency);
    if (newCurrency === "USD") {
      setExchangeRate(defaultRates.usdToInr);
    } else if (newCurrency === "AED") {
      setExchangeRate(defaultRates.aedToInr);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) {
      setError("Please select an invoice first.");
      return;
    }

    if (Number(exchangeRate) <= 0) {
      setError("Exchange rate must be greater than 0");
      return;
    }
    if (Number(intendedAmount) <= 0 && type !== "REFUND") {
      setError("Amount must be greater than 0");
      return;
    }

    setSubmitting(true);
    setError("");

    const totalFees = fees.reduce((sum, f) => sum + f.amount, 0);

    if (totalFees > intendedAmount && type === "PAYMENT") {
      setError("Fees cannot exceed intended amount.");
      setSubmitting(false);
      return;
    }

    try {
      const payload = {
        invoiceId: selectedInvoice._id,
        companyId: selectedInvoice.companyId || undefined,
        type,
        method,
        currency,
        exchangeRate: Number(exchangeRate),
        intendedAmount: Number(intendedAmount),
        receivedAmount: Number(receivedAmount),
        fees: fees
          .filter((f) => f.amount > 0)
          .map((f) => ({
            type: f.type,
            amount: Number(f.amount),
            currency,
          })),
      };

      const res = await fetch(`${apiPrefix}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to record payment");

      setModalOpen(false);
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to record payment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-2">
        <DashboardPageHeader
          title="Payments Ledger"
          description="Global view of all recorded invoice payments and refunds."
        />
        <Button onClick={() => setModalOpen(true)} className="shrink-0 gap-2 font-medium">
          <Plus className="w-4 h-4" /> Add Payment
        </Button>
      </div>

      <ResourceTableClient
        title="Payments"
        description="All recorded invoice payments."
        endpoint="/api/admin/payments"
        showPageHeader={false}
        refreshKey={refreshKey}
        columns={[
          { key: "invoiceId", label: "Invoice #" },
          { key: "receivedAmount", label: "Amount" },
          { key: "currency", label: "Curr" },
          { key: "method", label: "Method" },
          { key: "transactionId", label: "Tx ID" },
          { key: "createdAt", label: "Date" },
        ]}
        extraRowLinks={[
          { label: "Invoice Detail", hrefPattern: `${pathPrefix}/invoices/{invoiceId}` }
        ]}
        onView={(id) => setViewingPaymentId(id)}
        onDelete={async (id) => {
          const res = await fetch(`${apiPrefix}/payments/${id}`, { method: "DELETE" });
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.message || "Failed to delete payment");
          }
          setRefreshKey(k => k + 1);
        }}
      />

      <div className="mt-4 flex gap-4">
        {/* We can't easily add a second 'onView' type action to the generic table, 
            so we'll use a hack: if the user clicks 'Invoice Detail' link, it goes to the page.
            But I'll add a 'Statement' button in the PaymentDetailModal instead, or 
            I can modify ResourceTableClient to support multiple actions.
            Actually, the user said "add the Financial Statement in the Payments page".
        */}
      </div>

      {/* Payment Action Overrides (View Details) */}
      <div className="absolute right-0 top-0 opacity-0 pointer-events-none">
        {/* This is a hack to add a custom action to ResourceTableClient without more complex prop drilling right now */}
      </div>

      {viewingPaymentId && (
        <PaymentDetailModal 
          paymentId={viewingPaymentId} 
          apiPrefix={apiPrefix} 
          onClose={() => setViewingPaymentId(null)} 
          onOpenStatement={(id) => setViewingLedgerInvoiceId(id)}
        />
      )}

      {viewingLedgerInvoiceId && (
        <InvoiceLedgerModal 
          invoiceId={viewingLedgerInvoiceId} 
          apiPrefix={apiPrefix} 
          onClose={() => setViewingLedgerInvoiceId(null)} 
        />
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setModalOpen(false)}
          />

          <div
            className="relative w-full max-w-[500px] bg-card rounded-2xl shadow-2xl border border-border/60 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-border/50 bg-muted/10 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 ring-1 ring-primary/20">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">Record Transaction</h2>
                  <p className="text-sm text-muted-foreground">Log a new payment or refund</p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto overflow-x-hidden flex-1 custom-scrollbar">
              <form id="global-payment-form" onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
                    {error}
                  </div>
                )}

                <div className="space-y-4">
                  <div className="space-y-2.5">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Search & Select Invoice
                    </Label>
                    <InvoiceSearchPicker
                      id="invoice-search"
                      value={selectedInvoice?._id || ""}
                      onChange={(inv) => {
                        if (inv) handleInvoiceSelect(inv._id);
                        else setSelectedInvoice(null);
                      }}
                      helperText="Type the invoice number (e.g. INV-001) to find it instantly."
                    />
                  </div>
                </div>

                {selectedInvoice && (
                  <div className="animate-in fade-in slide-in-from-top-4 duration-300 space-y-6">
                    {/* Selected Invoice Summary Banner */}
                    <div className="p-3 bg-primary/5 border border-primary/10 rounded-xl flex justify-between items-center">
                      <div>
                        <p className="text-xs text-muted-foreground">Selected Invoice</p>
                        <p className="font-semibold text-primary">{selectedInvoice.invoiceNumber}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="font-mono text-sm">
                          {selectedInvoice.invoiceType === "usd" ? "USD" : "AED"}{" "}
                          {selectedInvoice.total?.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                      <div className="space-y-2.5">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Type
                        </Label>
                        <Select
                          value={type}
                          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setType(e.target.value)}
                          options={[
                            { value: "PAYMENT", label: "Payment (Received)" },
                            { value: "REFUND", label: "Refund (Returned)" },
                          ]}
                        />
                      </div>
                      <div className="space-y-2.5">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Method
                        </Label>
                        <Select
                          value={method}
                          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setMethod(e.target.value)}
                          options={[
                            { value: "BANK_TRANSFER", label: "Bank Transfer" },
                            { value: "STRIPE", label: "Stripe" },
                            { value: "PAYPAL", label: "PayPal" },
                            { value: "UPI", label: "UPI" },
                            { value: "CASH", label: "Cash" },
                            { value: "CHEQUE", label: "Cheque" },
                            { value: "OTHER", label: "Other" },
                          ]}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                      <div className="space-y-2.5">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex justify-between items-center">
                          <span>Currency</span>
                          {selectedInvoice?.fixCurrency && (
                            <span className="text-[10px] bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded-full uppercase font-bold">Locked by Project</span>
                          )}
                        </Label>
                        <Select
                          value={currency}
                          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleCurrencyChange(e.target.value)}
                          disabled={!!selectedInvoice?.fixCurrency}
                          options={[
                            { value: "AED", label: "AED" },
                            { value: "USD", label: "USD" },
                          ]}
                        />
                      </div>
                      <div className="space-y-2.5">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex justify-between items-center">
                          <span>Exchange Rate (to INR)</span>
                          {defaultRates.isLocked ? (
                            <span className="p-1 rounded-md bg-brand/10 text-brand" title="Locked by company settings">
                              <Lock className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            <span className="p-1 rounded-md text-muted-foreground" title="Editable">
                              <Unlock className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </Label>
                        <Input
                          type="number"
                          step="0.0001"
                          min="0"
                          required
                          value={exchangeRate}
                          onChange={(e) => setExchangeRate(Number(e.target.value))}
                          disabled={defaultRates.isLocked}
                          className={`font-mono ${
                            defaultRates.isLocked ? "bg-muted/50 text-muted-foreground border-dashed" : ""
                          }`}
                        />
                      </div>
                    </div>

                    <div className="space-y-4 bg-muted/20 border border-border/50 rounded-xl p-4">
                      <div className="space-y-2.5">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex justify-between items-center">
                          <span>Intended Amount (Client Paid)</span>
                          <button
                            type="button"
                            onClick={() => {
                              if (selectedInvoice?.total) {
                                const invExchangeRate = selectedInvoice.exchangeRate || 1;
                                const totalIntendedBase = selectedInvoice.totalsCache?.totalIntendedBase || 0;
                                const invoiceTotalBase = selectedInvoice.total * invExchangeRate;
                                const remainingBase = Math.max(0, invoiceTotalBase - totalIntendedBase);
                                const remainingOriginal = Math.round((remainingBase / invExchangeRate) * 100) / 100;
                                
                                const targetAmount = remainingOriginal > 0 ? remainingOriginal : selectedInvoice.total;
                                setIntendedAmount(targetAmount);
                                if (receivedAmount === 0) setReceivedAmount(targetAmount);
                              }
                            }}
                            className="text-[10px] bg-primary/10 text-primary hover:bg-primary/20 px-2 py-0.5 rounded-md transition-colors"
                          >
                            Auto-fill Balance
                          </button>
                        </Label>
                        <div className="flex items-center relative">
                          <span className="absolute left-3 text-sm font-semibold text-muted-foreground">
                            {currency}
                          </span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0.01"
                            required
                            value={intendedAmount || ""}
                            onChange={(e) => setIntendedAmount(Number(e.target.value))}
                            className="pl-12 font-mono text-base bg-background/80"
                            placeholder="0.00"
                          />
                        </div>
                      </div>

                      {type === "PAYMENT" && (
                        <div className="space-y-2.5">
                          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex justify-between items-center">
                            <span>Received Amount (Hit Bank)</span>
                            <button
                              type="button"
                              onClick={() => {
                                const totalFees = fees.reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
                                setReceivedAmount(Math.max(0, intendedAmount - totalFees));
                              }}
                              className="text-[10px] bg-muted hover:bg-muted-foreground/20 text-muted-foreground px-2 py-0.5 rounded-md transition-colors flex items-center gap-1"
                            >
                              <Calculator className="w-3 h-3" /> Auto-calc
                            </button>
                          </Label>
                          <div className="flex items-center relative">
                            <span className="absolute left-3 text-sm font-semibold text-muted-foreground">
                              {currency}
                            </span>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              required
                              value={receivedAmount || ""}
                              onChange={(e) => setReceivedAmount(Number(e.target.value))}
                              className="pl-12 font-mono text-base bg-background/80"
                              placeholder="0.00"
                            />
                          </div>
                          {intendedAmount > 0 && receivedAmount > 0 && intendedAmount !== receivedAmount && (
                            <p className="text-xs text-amber-600 dark:text-amber-500 font-medium text-right flex items-center justify-end gap-1">
                              <RotateCcw className="w-3 h-3" /> Delta: {currency}{" "}
                              {Math.abs(intendedAmount - receivedAmount).toFixed(2)}
                            </p>
                          )}
                        </div>
                      )}

                      {type === "PAYMENT" && (
                        <div className="space-y-3 pt-4 border-t border-border/60">
                          <div className="flex items-center justify-between">
                            <Label className="font-medium text-foreground">Deducted Fees (Optional)</Label>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs px-2"
                              onClick={() => setFees([...fees, { type: "GATEWAY_FEE", amount: 0 }])}
                            >
                              <Plus className="w-3 h-3 mr-1" /> Add Fee
                            </Button>
                          </div>

                          {fees.length === 0 ? (
                            <div className="text-xs text-muted-foreground italic text-center py-2 bg-background/50 rounded border border-dashed">
                              No fees added.
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {fees.map((fee, idx) => (
                                <div key={idx} className="flex items-start gap-2 relative group">
                                  <div className="flex-1 space-y-2">
                                    <Select
                                      value={fee.type}
                                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                        const newFees = [...fees];
                                        newFees[idx].type = e.target.value;
                                        setFees(newFees);
                                      }}
                                      options={[
                                        { value: "GATEWAY_FEE", label: "Gateway Fee (Stripe/PayPal)" },
                                        { value: "BANK_CHARGE", label: "Bank Charge" },
                                        { value: "FOREX", label: "Forex Markup" },
                                        { value: "TDS", label: "TDS / Tax Deducted" },
                                        { value: "OTHER", label: "Other" },
                                      ]}
                                    />
                                    <div className="flex items-center relative">
                                      <span className="absolute left-3 text-sm font-semibold text-muted-foreground">
                                        {currency}
                                      </span>
                                      <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={fee.amount || ""}
                                        onChange={(e) => {
                                          const newFees = [...fees];
                                          newFees[idx].amount = Number(e.target.value);
                                          setFees(newFees);
                                        }}
                                        className="pl-12 font-mono text-sm h-9 bg-background/80"
                                        placeholder="0.00"
                                      />
                                    </div>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="mt-1 h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                                    onClick={() => setFees(fees.filter((_, i) => i !== idx))}
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              ))}
                              {fees.reduce((s, f) => s + f.amount, 0) > 0 && (
                                <p className="text-xs font-medium text-red-500/80 text-right mt-2">
                                  Total Fees: ≈ ₹
                                  {(fees.reduce((s, f) => s + f.amount, 0) * exchangeRate).toLocaleString(
                                    undefined,
                                    { maximumFractionDigits: 2 }
                                  )}{" "}
                                  Base Lost
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </form>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border/50 bg-muted/10 shrink-0 flex items-center justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button form="global-payment-form" type="submit" disabled={submitting || !selectedInvoice}>
                {submitting ? "Saving..." : `Confirm ${type}`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
