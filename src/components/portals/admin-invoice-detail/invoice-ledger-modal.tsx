"use client";

import { useState, useEffect } from "react";
import { X, FileText, Landmark, TrendingUp, AlertCircle, CheckCircle2, IndianRupee, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

interface InvoiceLedgerModalProps {
  invoiceId: string;
  apiPrefix: string;
  onClose: () => void;
}

export function InvoiceLedgerModal({ invoiceId, apiPrefix, onClose }: InvoiceLedgerModalProps) {
  const [data, setData] = useState<{ invoice: any, payments: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${apiPrefix}/invoices/${invoiceId}/ledger`);
        const result = await res.json();
        if (!res.ok) throw new Error(result.message || "Failed to load ledger");
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [invoiceId, apiPrefix]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <div className="bg-card w-full max-w-3xl rounded-2xl p-6 shadow-2xl border">
          <Skeleton className="h-10 w-1/3 mb-6" />
          <div className="grid grid-cols-3 gap-4 mb-8">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { invoice, payments } = data;
  const cache = invoice.totalsCache || {};
  const totalIntended = cache.totalIntendedBase || 0;
  const totalReceived = cache.totalReceivedBase || 0;
  const balance = totalIntended - totalReceived;
  const isPaid = invoice.status === "PAID";
  const currency = String(invoice.currency || invoice.invoiceType || "AED").toUpperCase();

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative bg-card w-full max-w-4xl rounded-2xl shadow-2xl border border-border/60 flex flex-col max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="px-8 py-5 border-b flex items-center justify-between bg-muted/5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-xl text-primary shadow-sm">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-xl tracking-tight">Invoice Financial Statement</h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold tracking-widest uppercase border ${
                  isPaid ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                }`}>
                  {invoice.status}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{invoice.invoiceNumber}</span> • {invoice.projectId?.name || "No Project"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 hover:bg-muted rounded-full transition-all hover:rotate-90 duration-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 overflow-y-auto space-y-10 custom-scrollbar">
          
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-2xl bg-muted/30 border border-border/50 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <Globe className="w-12 h-12" />
              </div>
              <p className="text-[10px] uppercase font-black tracking-[0.2em] text-muted-foreground mb-2">Invoice Amount</p>
              <p className="text-2xl font-black">{currency} {invoice.totals?.total?.toLocaleString()}</p>
              <p className="text-xs font-medium text-muted-foreground mt-1 flex items-center gap-1">
                <IndianRupee className="w-3 h-3" /> {totalIntended.toLocaleString()}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-green-500/[0.03] border border-green-500/10 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity text-green-500">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <p className="text-[10px] uppercase font-black tracking-[0.2em] text-green-600/70 mb-2">Total Collected</p>
              <p className="text-2xl font-black text-green-600">₹{totalReceived.toLocaleString()}</p>
              <p className="text-xs font-medium text-green-600/60 mt-1">
                {((totalReceived / (totalIntended || 1)) * 100).toFixed(1)}% of total received
              </p>
            </div>

            <div className={`p-5 rounded-2xl border relative overflow-hidden group ${
              balance > 0 
                ? 'bg-amber-500/[0.03] border-amber-500/10' 
                : 'bg-blue-500/[0.03] border-blue-500/10'
            }`}>
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                {balance > 0 ? <AlertCircle className="w-12 h-12 text-amber-500" /> : <TrendingUp className="w-12 h-12 text-blue-500" />}
              </div>
              <p className="text-[10px] uppercase font-black tracking-[0.2em] text-muted-foreground mb-2">
                {balance > 0 ? 'Remaining Balance' : 'Overpaid / Credit'}
              </p>
              <p className={`text-2xl font-black ${balance > 0 ? 'text-amber-600' : 'text-blue-600'}`}>
                ₹{Math.abs(balance).toLocaleString()}
              </p>
              <p className="text-xs font-medium text-muted-foreground mt-1">
                {balance > 0 ? 'Pending collection' : 'Excess received from client'}
              </p>
            </div>
          </div>

          {/* Detailed Ledger Table */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold flex items-center gap-2">
                <Landmark className="w-4 h-4 text-primary" />
                Transaction History
              </h4>
              <span className="text-[10px] font-bold text-muted-foreground uppercase">{payments.length} Records found</span>
            </div>
            
            <div className="border rounded-2xl overflow-hidden bg-background shadow-sm">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-muted/30 text-[10px] uppercase font-black tracking-widest text-muted-foreground border-b">
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Original</th>
                    <th className="px-6 py-4">Rate</th>
                    <th className="px-6 py-4">Base (₹)</th>
                    <th className="px-6 py-4 text-right">Method</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {payments.map((p, idx) => (
                    <tr key={p._id} className="hover:bg-muted/5 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold">{format(new Date(p.createdAt), "dd MMM yyyy")}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">{format(new Date(p.createdAt), "HH:mm")}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${
                          p.type === 'REFUND' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'
                        }`}>
                          {p.type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono font-bold">{p.currency} {p.receivedAmount.toLocaleString()}</span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground font-mono text-xs">
                        @{p.exchangeRate}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className={`font-black ${p.type === 'REFUND' ? 'text-red-500' : 'text-foreground'}`}>
                            {p.type === 'REFUND' ? '-' : '+'}₹{p.receivedAmountBase.toLocaleString()}
                          </span>
                          {p.fees?.length > 0 && (
                            <span className="text-[9px] text-red-400 font-bold">
                              Incl. ₹{(p.fees.reduce((s: any, f: any) => s + (f.baseAmount || 0), 0)).toLocaleString()} Fees
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex flex-col items-end">
                          <span className="font-bold uppercase tracking-tighter text-xs">{p.method.replace('_', ' ')}</span>
                          <span className="text-[9px] text-muted-foreground truncate max-w-[100px]" title={p.transactionId}>
                            {p.transactionId || "No TX ID"}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {payments.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground italic">
                        No payments recorded for this invoice yet.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-muted/10 border-t font-bold">
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-right uppercase text-[10px] tracking-widest text-muted-foreground">Net Position (Base)</td>
                    <td className="px-6 py-4 font-black text-lg">₹{totalReceived.toLocaleString()}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Footer Info */}
          <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/10">
            <AlertCircle className="w-5 h-5 text-primary" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              This statement includes all confirmed transactions and refunds. Values are converted to the base currency (INR) using the exchange rate locked at the time of each transaction. 
              <strong> Current Status: {isPaid ? 'Fully settled.' : `₹${balance.toLocaleString()} remaining.`}</strong>
            </p>
          </div>

        </div>

        {/* Modal Footer Actions */}
        <div className="px-8 py-5 border-t bg-muted/5 flex items-center justify-between">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            Generated on {format(new Date(), "PPpp")}
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onClose} className="rounded-xl px-6">Close</Button>
            <Button 
              className="rounded-xl px-6 font-bold shadow-lg shadow-primary/20"
              onClick={() => window.print()}
            >
              Print Statement
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
