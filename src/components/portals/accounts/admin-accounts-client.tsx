"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  Plus, 
  Wallet, 
  Landmark, 
  X, 
  Loader2, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight,
  TrendingUp,
  History
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { apiFetch } from "@/lib/api/client";
import { SUPPORTED_CURRENCIES } from "@/lib/constants/finance";
import { TransferFundsModal } from "./transfer-funds-modal";

const EXCHANGE_RATES_TO_INR: Record<string, number> = {
  INR: 1,
  USD: 83.0,
  AED: 22.6,
  RM: 18.2,
  SGD: 62.5
};

export function AdminAccountsClient({ apiPrefix }: { apiPrefix: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [projection, setProjection] = useState<any>(null);
  const [projectionLoading, setProjectionLoading] = useState(true);
  
  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Ledger state
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [txPage, setTxPage] = useState(1);
  const [txTotal, setTxTotal] = useState(0);
  const [txHasMore, setTxHasMore] = useState(false);
  const txLimit = 5;

  const [form, setForm] = useState({
    name: "",
    currency: "AED",
    type: "BANK",
    provider: "",
    openingBalance: "0",
    isPrimary: false
  });

  const loadProjection = useCallback(async () => {
    try {
      const res = await apiFetch<any>(`${apiPrefix}/treasury/projection`);
      setProjection(res.projection);
    } catch (err) {
      console.error("Failed to load treasury projection", err);
    } finally {
      setProjectionLoading(false);
    }
  }, [apiPrefix]);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch<{ items: any[] }>(`${apiPrefix}/accounts`);
      const accountsList = res.items || [];
      setItems(accountsList);
      
      // Auto-select first account's ledger if none selected yet
      if (accountsList.length > 0 && !selectedAccountId) {
        setSelectedAccountId(accountsList[0]._id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [apiPrefix, selectedAccountId]);

  useEffect(() => {
    load();
    loadProjection();
  }, [load, loadProjection]);

  // Load transactions whenever selected account or page changes
  const loadTransactions = useCallback(async () => {
    if (!selectedAccountId) return;
    setTransactionsLoading(true);
    try {
      const res = await apiFetch<any>(
        `${apiPrefix}/accounts/${selectedAccountId}/transactions?page=${txPage}&limit=${txLimit}`
      );
      setTransactions(res.items || []);
      setTxTotal(res.total || 0);
      setTxHasMore(res.hasMore || false);
    } catch (err) {
      console.error("Failed to load transactions", err);
    } finally {
      setTransactionsLoading(false);
    }
  }, [selectedAccountId, txPage, apiPrefix]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await apiFetch(`${apiPrefix}/accounts`, {
        method: "POST",
        body: JSON.stringify({
          ...form,
          currentBalance: Number(form.openingBalance)
        }),
      });
      setModalOpen(false);
      // Reset form
      setForm({
        name: "",
        currency: "AED",
        type: "BANK",
        provider: "",
        openingBalance: "0",
        isPrimary: false
      });
      load();
      loadProjection();
    } catch (err: any) {
      setError(err.message || "Failed to create account");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAccountClick = (accountId: string) => {
    setSelectedAccountId(accountId);
    setTxPage(1); // Reset pagination
  };

  const selectedAccount = items.find(a => a._id === selectedAccountId);
  const primaryAccount = items.find(a => a.isPrimary);

  // Financial aggregation for native client totals
  const totalNetWorthInr = items.reduce((acc, account) => {
    const rate = EXCHANGE_RATES_TO_INR[account.currency] || 1;
    return acc + (account.currentBalance || 0) * rate;
  }, 0);

  const currenciesBreakdown = items.reduce((acc, account) => {
    acc[account.currency] = (acc[account.currency] || 0) + (account.currentBalance || 0);
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <DashboardPageHeader 
          title="Financial Accounts" 
          description="Manage your bank accounts, digital wallets, and cash reserves."
        />
        <div className="flex items-center gap-3">
          <Button onClick={() => setTransferOpen(true)} variant="outline" className="gap-2 border-border/80 hover:bg-muted/50">
            <RefreshCw className="w-4 h-4" /> Transfer Funds
          </Button>
          <Button onClick={() => setModalOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Add Account
          </Button>
        </div>
      </div>

      {/* 🆕 Treasury Summary Header (Projection Driven) */}
      {projectionLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="border-border/60 bg-background/30 shadow-sm flex flex-col justify-between p-5 min-h-[120px] animate-pulse">
              <div className="h-3.5 w-24 bg-muted/40 rounded-md" />
              <div className="mt-4 h-8 w-32 bg-muted/65 rounded-md" />
              <div className="mt-2 h-3.5 w-44 bg-muted/40 rounded-md" />
            </Card>
          ))}
        </div>
      ) : projection && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Card 1: Total Assets (Dominant Operational Anchor) */}
          <Card className="border-primary/20 bg-gradient-to-br from-primary/[0.03] to-background/55 hover:bg-background/85 transition-all shadow-sm ring-1 ring-primary/10 relative overflow-hidden flex flex-col justify-between p-5 min-h-[120px]">
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <span>Total Assets</span>
              <TrendingUp className="w-3.5 h-3.5 text-primary animate-pulse" />
            </div>
            <div className="mt-4">
              <span className="text-sm font-medium text-muted-foreground mr-1">INR</span>
              <span className="text-xl font-extrabold tracking-tight text-foreground tabular-nums">
                {projection.totalAssetsBase.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground mt-2 block font-medium">Aggregated bank & reserve assets</span>
          </Card>

          {/* Card 2: Receivables Pipeline (Secondary) */}
          <Card className="border-border/60 bg-background/50 hover:bg-background/80 transition-colors shadow-sm relative overflow-hidden flex flex-col justify-between p-5 min-h-[120px]">
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <span>Receivables Pipeline</span>
              <History className="w-3.5 h-3.5 text-indigo-500/80" />
            </div>
            <div className="mt-4">
              <span className="text-sm font-medium text-muted-foreground mr-1">INR</span>
              <span className="text-xl font-extrabold tracking-tight text-foreground tabular-nums">
                {projection.totalReceivablesBase.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground mt-2 block">
              {projection.unsettledInvoicesCount} open {projection.unsettledInvoicesCount === 1 ? 'invoice' : 'invoices'} pending
            </span>
          </Card>

          {/* Card 3: Unallocated Funds (Secondary) */}
          <Card className="border-border/60 bg-background/50 hover:bg-background/80 transition-colors shadow-sm relative overflow-hidden flex flex-col justify-between p-5 min-h-[120px]">
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <span>Unallocated Funds</span>
              <Wallet className="w-3.5 h-3.5 text-amber-500/80" />
            </div>
            <div className="mt-4">
              <span className="text-sm font-medium text-muted-foreground mr-1">INR</span>
              <span className="text-xl font-extrabold tracking-tight text-foreground tabular-nums">
                {projection.totalUnallocatedPaymentsBase.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground mt-2 block">Logged payments awaiting allocation</span>
          </Card>

          {/* Card 4: Reconciliation Integrity (Emotionally Grounding Anchor) */}
          <Card className={`transition-all duration-300 shadow-sm relative overflow-hidden flex flex-col justify-between p-5 min-h-[120px] ${
            projection.reconciliationScore === 100 
              ? 'border-emerald-500/20 bg-emerald-500/[0.02] shadow-[0_0_12px_rgba(16,185,129,0.03)]' 
              : 'border-border/60 bg-background/50'
          }`}>
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <span>Reconciliation</span>
              <span className={`size-2 rounded-full ${
                projection.reconciliationScore === 100 
                  ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse' 
                  : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)] animate-pulse'
              }`} />
            </div>
            <div className="mt-4 flex flex-col gap-1">
              <span className="text-xl font-extrabold tracking-tight text-foreground tabular-nums">
                {projection.reconciliationScore}%
              </span>
              <span className={`inline-flex items-center justify-center text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md w-max ${
                projection.reconciliationScore === 100 
                  ? 'bg-emerald-500/10 text-emerald-600' 
                  : 'bg-amber-500/10 text-amber-600'
              }`}>
                {projection.reconciliationScore === 100 ? 'Fully Reconciled' : 'Pending Allocation'}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground mt-2 block">Ledger and asset audit score</span>
          </Card>
        </div>
      )}

      {/* Grid of Accounts */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary/40" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {items.map(account => {
            const isSelected = account._id === selectedAccountId;
            return (
              <Card 
                key={account._id} 
                onClick={() => handleAccountClick(account._id)}
                className={`relative overflow-hidden group hover:border-primary/40 cursor-pointer transition-all shadow-sm ${
                  isSelected ? 'ring-2 ring-primary border-primary/40 bg-primary/[0.01]' : ''
                }`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className={`p-2.5 rounded-xl ring-1 transition-all ${
                      isSelected 
                        ? 'bg-primary text-primary-foreground ring-primary' 
                        : 'bg-primary/10 text-primary ring-primary/20 group-hover:bg-primary/20'
                    }`}>
                      {account.type === 'BANK' ? <Landmark className="w-5 h-5" /> : <Wallet className="w-5 h-5" />}
                    </div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider bg-muted px-2.5 py-1 rounded-lg">
                      {account.currency}
                    </span>
                  </div>
                  <CardTitle className="text-lg mt-4 font-semibold tracking-tight">{account.name}</CardTitle>
                  <p className="text-xs text-muted-foreground">{account.provider || 'Local Wallet'}</p>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold tracking-tighter tabular-nums mt-1">
                    {account.currentBalance?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/40">
                    <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-widest">Available Balance</span>
                    {account.isPrimary && (
                      <span className="flex items-center gap-1 text-[9px] font-bold text-primary uppercase tracking-wider bg-primary/10 px-2 py-0.5 rounded-full">
                        <span className="size-1 rounded-full bg-primary animate-pulse" /> Primary
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          <button 
            onClick={() => setModalOpen(true)}
            className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed rounded-2xl hover:bg-muted/30 transition-all border-muted-foreground/15 group hover:border-primary/30"
          >
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-all group-hover:scale-110">
              <Plus className="w-6 h-6" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-sm">Add New Account</p>
              <p className="text-xs text-muted-foreground">Setup bank or cash wallet</p>
            </div>
          </button>
        </div>
      )}

      {/* Transaction Ledger Table */}
      {selectedAccountId && selectedAccount && (
        <Card className="border-border/80 shadow-sm animate-in slide-in-from-bottom duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/80">
            <div className="space-y-0.5">
              <CardTitle className="text-base flex items-center gap-2">
                <History className="w-4 h-4 text-primary" />
                Ledger Audit Trail: {selectedAccount.name}
              </CardTitle>
              <p className="text-xs text-muted-foreground">Chronological credit and debit ledger logs</p>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={txPage === 1 || transactionsLoading} 
                onClick={() => setTxPage(p => Math.max(1, p - 1))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs font-semibold tabular-nums">
                Page {txPage} of {Math.ceil(txTotal / txLimit) || 1}
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={!txHasMore || transactionsLoading} 
                onClick={() => setTxPage(p => p + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {transactionsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary/40" />
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground">
                No ledger transactions found for this account.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/20 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                      <th className="px-6 py-3.5">Date</th>
                      <th className="px-6 py-3.5">Type</th>
                      <th className="px-6 py-3.5">Amount</th>
                      <th className="px-6 py-3.5">Running Balance</th>
                      <th className="px-6 py-3.5">Note</th>
                      <th className="px-6 py-3.5">Initiator</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {transactions.map((tx) => {
                      const isCredit = tx.type === "CREDIT";
                      return (
                        <tr key={tx._id} className="hover:bg-muted/10 transition-colors">
                          <td className="px-6 py-4 font-medium text-xs whitespace-nowrap">
                            {new Date(tx.createdAt).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                              isCredit 
                                ? 'bg-green-500/10 text-green-600' 
                                : 'bg-red-500/10 text-red-500'
                            }`}>
                              {isCredit ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                              {tx.type}
                            </span>
                          </td>
                          <td className={`px-6 py-4 font-bold tabular-nums whitespace-nowrap ${
                            isCredit ? 'text-green-600' : 'text-red-500'
                          }`}>
                            {isCredit ? '+' : '-'}{tx.currency} {tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 font-semibold text-muted-foreground tabular-nums whitespace-nowrap">
                            {tx.currency} {tx.balanceAfter.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 text-xs font-medium text-muted-foreground max-w-xs truncate">
                            {tx.note || "-"}
                          </td>
                          <td className="px-6 py-4 text-xs font-semibold whitespace-nowrap">
                            {tx.createdBy?.name || "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Setup Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="relative w-full max-w-[450px] bg-card rounded-2xl shadow-2xl border border-border overflow-hidden animate-in fade-in duration-200">
            <div className="px-6 py-5 border-b bg-muted/10 flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight">Setup New Account</h2>
              <button onClick={() => setModalOpen(false)} className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm font-medium">{error}</div>}
              
              <div className="space-y-2">
                <Label>Account Name</Label>
                <Input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Wise USD, Main Bank AED" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select 
                    value={form.currency} 
                    onChange={e => setForm({...form, currency: e.target.value})}
                    options={[...SUPPORTED_CURRENCIES]}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select 
                    value={form.type} 
                    onChange={e => setForm({...form, type: e.target.value})}
                    options={[
                      { value: "BANK", label: "Bank Account" },
                      { value: "GATEWAY", label: "Digital Gateway" },
                      { value: "CASH", label: "Cash Reserve" },
                    ]}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Provider / Bank Name</Label>
                <Input value={form.provider} onChange={e => setForm({...form, provider: e.target.value})} placeholder="e.g. HSBC, Stripe, PayPal" />
              </div>

              <div className="space-y-2">
                <Label>Opening Balance</Label>
                <Input type="number" step="0.01" value={form.openingBalance} onChange={e => setForm({...form, openingBalance: e.target.value})} />
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="isPrimary" 
                    checked={form.isPrimary} 
                    onChange={e => setForm({...form, isPrimary: e.target.checked})} 
                    className="rounded border-border cursor-pointer size-4 text-primary focus:ring-primary" 
                  />
                  <Label htmlFor="isPrimary" className="cursor-pointer font-medium select-none text-sm">Set as Primary Account</Label>
                </div>
                {primaryAccount && (
                  <div className="text-[11px] text-amber-600 bg-amber-500/5 p-2.5 border border-amber-500/20 rounded-xl space-y-1">
                    <p className="font-semibold flex items-center gap-1">
                      ⚠️ "{primaryAccount.name}" ({primaryAccount.currency}) is already the primary account.
                    </p>
                    {form.isPrimary && (
                      <p className="font-normal text-amber-700 leading-normal">
                        Saving this account as primary will automatically unset "{primaryAccount.name}" as the primary account.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-4 flex gap-3">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="flex-1 gap-2" disabled={submitting}>
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Account
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      <TransferFundsModal 
        isOpen={transferOpen}
        onClose={() => setTransferOpen(false)}
        onSuccess={() => {
          load();
          loadTransactions();
        }}
        apiPrefix={apiPrefix}
      />

    </div>
  );
}
