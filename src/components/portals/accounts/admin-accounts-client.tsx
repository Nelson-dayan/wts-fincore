"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Wallet, Landmark, CreditCard, Banknote, X, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { apiFetch } from "@/lib/api/client";
import { SUPPORTED_CURRENCIES } from "@/lib/constants/finance";

export function AdminAccountsClient({ apiPrefix }: { apiPrefix: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    currency: "AED",
    type: "BANK",
    provider: "",
    openingBalance: "0",
    isPrimary: false
  });

  const load = useCallback(async () => {
    try {
      const res = await apiFetch<{ items: any[] }>(`${apiPrefix}/accounts`);
      setItems(res.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [apiPrefix]);

  useEffect(() => {
    load();
  }, [load]);

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
      load();
    } catch (err: any) {
      setError(err.message || "Failed to create account");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <DashboardPageHeader 
          title="Financial Accounts" 
          description="Manage your bank accounts, digital wallets, and cash reserves."
        />
        <Button onClick={() => setModalOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Add Account
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary/40" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {items.map(account => (
            <Card key={account._id} className="relative overflow-hidden group hover:border-primary/40 transition-all shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                      {account.type === 'BANK' ? <Landmark className="w-5 h-5" /> : <Wallet className="w-5 h-5" />}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-muted px-2.5 py-1 rounded-lg">
                    {account.currency}
                  </span>
                </div>
                <CardTitle className="text-lg mt-4 font-semibold tracking-tight">{account.name}</CardTitle>
                <p className="text-xs text-muted-foreground">{account.provider || 'Local Storage'}</p>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold tracking-tighter tabular-nums">
                  {account.currentBalance?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest mt-1">Available Balance</p>
                
                {account.isPrimary && (
                  <div className="mt-4 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 text-[10px] font-bold text-primary w-fit uppercase tracking-wider">
                    <div className="size-1 rounded-full bg-primary animate-pulse" /> Primary
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

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

      {/* Create Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="relative w-full max-w-[450px] bg-card rounded-2xl shadow-2xl border border-border overflow-hidden">
            <div className="px-6 py-5 border-b bg-muted/10 flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight">Setup New Account</h2>
              <button onClick={() => setModalOpen(false)} className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
              
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

              <div className="flex items-center gap-2 pt-2">
                <input type="checkbox" id="isPrimary" checked={form.isPrimary} onChange={e => setForm({...form, isPrimary: e.target.checked})} className="rounded border-border" />
                <Label htmlFor="isPrimary" className="cursor-pointer">Set as Primary Account</Label>
              </div>

              <div className="pt-4 flex gap-3">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="flex-1" disabled={submitting}>
                  {submitting ? "Creating..." : "Save Account"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
