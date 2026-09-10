"use client";

import { useState, useEffect, useMemo } from "react";
import { X, Receipt, Landmark, Calendar, Download, Printer, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface ClientStatementModalProps {
  clientId: string;
  isOpen: boolean;
  onClose: () => void;
  apiPrefix: string;
}

export function ClientStatementModal({ clientId, isOpen, onClose, apiPrefix }: ClientStatementModalProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen && clientId) {
      setLoading(true);
      setError("");
      fetch(`${apiPrefix}/clients/${clientId}/statement`)
        .then(res => res.json())
        .then(res => {
          setData(res);
        })
        .catch(err => {
          console.error("Failed to load client statement:", err);
          setError("Failed to load financial statement.");
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, clientId, apiPrefix]);

  // Interleave and sort chronologically
  const ledgerTimeline = useMemo(() => {
    if (!data) return [];
    
    const invoices = (data.invoices || []).map((inv: any) => ({
      _id: inv._id,
      date: new Date(inv.createdAt),
      type: "DEBIT",
      description: `Invoice ${inv.invoiceNumber}`,
      refNumber: inv.invoiceNumber,
      currency: String(inv.currency || inv.invoiceType || "AED").toUpperCase(),
      originalAmount: inv.totals?.total || 0,
      amountBase: inv.totalsCache?.totalIntendedBase || (inv.totals?.total * (inv.totalsCache?.totalIntendedBase / inv.totals?.total || 80)) || 0,
    }));

    const payments = (data.payments || []).map((pay: any) => ({
      _id: pay._id,
      date: new Date(pay.receivedAt || pay.savedAt || pay.createdAt),
      type: "CREDIT",
      description: `Payment ${pay.referenceNumber || pay.transactionId || "No Ref"}`,
      refNumber: pay.referenceNumber || pay.transactionId || "Ref",
      currency: String(pay.currency || "USD").toUpperCase(),
      originalAmount: pay.amount || 0,
      amountBase: pay.amountBase || 0,
    }));

    // Interleave and sort chronologically
    const combined = [...invoices, ...payments].sort((a, b) => a.date.getTime() - b.date.getTime());

    // Calculate running balance in base currency
    let runningBalance = 0;
    return combined.map(item => {
      if (item.type === "DEBIT") {
        runningBalance += item.amountBase;
      } else {
        runningBalance -= item.amountBase;
      }
      return {
        ...item,
        runningBalance,
      };
    });
  }, [data]);

  // Summary Metrics
  const summary = useMemo(() => {
    if (ledgerTimeline.length === 0) return { totalInvoiced: 0, totalPaid: 0, balanceDue: 0 };
    
    const totalInvoiced = ledgerTimeline
      .filter(x => x.type === "DEBIT")
      .reduce((sum, x) => sum + x.amountBase, 0);

    const totalPaid = ledgerTimeline
      .filter(x => x.type === "CREDIT")
      .reduce((sum, x) => sum + x.amountBase, 0);

    return {
      totalInvoiced,
      totalPaid,
      balanceDue: Math.max(0, totalInvoiced - totalPaid),
    };
  }, [ledgerTimeline]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative bg-card w-full max-w-5xl rounded-2xl shadow-2xl border border-border/60 flex flex-col max-h-[95vh] overflow-hidden">
        
        {/* Header */}
        <div className="px-8 py-5 border-b flex items-center justify-between bg-muted/10 shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl text-primary shadow-sm">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base tracking-tight">Client Statement of Account</h3>
              <p className="text-xs text-muted-foreground">
                Chronological financial timeline and net position ledger.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-muted rounded-full transition-all hover:rotate-90 duration-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Printable Statement Body */}
        <div id="statement-print-root" className="p-8 overflow-y-auto space-y-8 flex-1 custom-scrollbar print:bg-white print:p-0">
          
          {loading ? (
            <div className="space-y-6">
              <Skeleton className="h-10 w-1/3" />
              <div className="grid grid-cols-3 gap-4">
                <Skeleton className="h-24 rounded-xl" />
                <Skeleton className="h-24 rounded-xl" />
                <Skeleton className="h-24 rounded-xl" />
              </div>
              <Skeleton className="h-64 w-full rounded-xl" />
            </div>
          ) : error ? (
            <div className="p-4 bg-destructive/10 border border-destructive/20 text-sm text-destructive rounded-xl">
              {error}
            </div>
          ) : (
            <>
              {/* Statement Brand Header */}
              <div className="flex justify-between items-start border-b border-border/60 pb-6">
                <div className="space-y-2">
                  <span className="text-xl font-extrabold text-foreground tracking-tight select-none">
                    Docu<span className="text-primary">Trade</span> Statement
                  </span>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <p className="font-bold text-foreground uppercase tracking-widest text-[9px]">Client Profile</p>
                    <p className="font-semibold text-foreground text-sm">{data.client?.name}</p>
                    <p className="font-medium">{data.client?.company}</p>
                    <p>{data.client?.email}</p>
                    {data.client?.taxId && <p>TRN / TAX ID: {data.client.taxId}</p>}
                  </div>
                </div>

                <div className="text-right space-y-1.5 text-xs">
                  <span className="inline-flex items-center gap-1.5 text-[9px] font-extrabold text-primary bg-primary/10 px-2.5 py-0.5 rounded border border-primary/20 uppercase tracking-widest">
                    <Calendar className="w-3 h-3" /> Ledger Summary
                  </span>
                  <div className="text-muted-foreground space-y-0.5">
                    <p>Date: <span className="font-semibold text-foreground">{new Date().toLocaleDateString(undefined, { PP: true } as any)}</span></p>
                    <p>Ledger Base: <span className="font-semibold text-foreground">INR</span></p>
                    <p>Statement Range: <span className="font-semibold text-foreground">All-time</span></p>
                  </div>
                </div>
              </div>

              {/* KPI metrics cards */}
              <div className="grid grid-cols-3 gap-6">
                <div className="p-5 rounded-2xl bg-muted/20 border border-border/50">
                  <p className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground mb-1">Total Invoiced (Debits)</p>
                  <p className="text-xl font-black text-foreground">₹{summary.totalInvoiced.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">Aggregated outstanding invoice sum</p>
                </div>
                <div className="p-5 rounded-2xl bg-green-500/[0.03] border border-green-500/10">
                  <p className="text-[9px] uppercase font-bold tracking-widest text-green-600 mb-1">Total Received (Credits)</p>
                  <p className="text-xl font-black text-green-600">₹{summary.totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                  <p className="text-[10px] text-green-600/60 mt-0.5 font-medium">Aggregated ledger settlements</p>
                </div>
                <div className={`p-5 rounded-2xl border ${summary.balanceDue > 0 ? 'bg-amber-500/[0.03] border-amber-500/10' : 'bg-blue-500/[0.03] border-blue-500/10'}`}>
                  <p className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground mb-1">Net Balance Due</p>
                  <p className={`text-xl font-black ${summary.balanceDue > 0 ? 'text-amber-600' : 'text-blue-600'}`}>
                    ₹{summary.balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">
                    {summary.balanceDue > 0 ? "Pending collection balance" : "Fully settled ledger"}
                  </p>
                </div>
              </div>

              {/* Ledger Timeline Table */}
              <div className="space-y-3">
                <h4 className="font-bold flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                  <Landmark className="w-4 h-4 text-primary" />
                  Chronological Transaction History
                </h4>
                
                <div className="border border-border/80 rounded-2xl overflow-hidden bg-background">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-muted/40 text-[9px] uppercase font-bold tracking-widest text-muted-foreground border-b border-border/80">
                        <th className="px-6 py-3.5">Date</th>
                        <th className="px-6 py-3.5">Document / Details</th>
                        <th className="px-6 py-3.5">Original</th>
                        <th className="px-6 py-3.5">Debits (+)</th>
                        <th className="px-6 py-3.5">Credits (-)</th>
                        <th className="px-6 py-3.5 text-right">Running Balance (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {ledgerTimeline.map((item, idx) => {
                        const isDebit = item.type === "DEBIT";
                        const formattedDate = item.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                        return (
                          <tr key={idx} className="hover:bg-muted/5 transition-colors text-xs">
                            <td className="px-6 py-3.5 font-mono text-[11px] text-muted-foreground">{formattedDate}</td>
                            <td className="px-6 py-3.5">
                              <span className="font-bold text-foreground">{item.description}</span>
                            </td>
                            <td className="px-6 py-3.5">
                              <span className="font-mono font-bold text-muted-foreground">
                                {item.currency} {item.originalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </span>
                            </td>
                            <td className="px-6 py-3.5 font-mono font-bold text-foreground">
                              {isDebit ? `₹${item.amountBase.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "—"}
                            </td>
                            <td className="px-6 py-3.5 font-mono font-bold text-green-600">
                              {!isDebit ? `₹${item.amountBase.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "—"}
                            </td>
                            <td className="px-6 py-3.5 text-right font-mono font-bold text-foreground">
                              ₹{item.runningBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      })}
                      {ledgerTimeline.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground italic">
                            No ledger history found for this client.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Allocations breakdown */}
              {data.allocations?.length > 0 && (
                <div className="space-y-3 pt-4">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                    🔀 Invoice Allocations Mapping
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {data.allocations.map((alloc: any, idx: number) => {
                      const payDate = new Date(alloc.allocatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                      const invNo = alloc.invoiceId?.invoiceNumber || "Invoice";
                      return (
                        <div key={idx} className="p-3 bg-muted/20 rounded-xl border border-border/80 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="size-2 rounded-full bg-primary animate-pulse" />
                            <span className="font-medium">
                              Applied to <span className="font-bold">{invNo}</span>
                            </span>
                          </div>
                          <span className="font-mono font-bold text-foreground">
                            {String(alloc.allocatedCurrency).toUpperCase()} {alloc.allocatedAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

        </div>

        {/* Footer Actions */}
        <div className="px-8 py-5 border-t bg-muted/10 flex items-center justify-between shrink-0 print:hidden">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            Generated on {new Date().toLocaleDateString(undefined, { PP: true } as any)}
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onClose} disabled={loading}>Close</Button>
            <Button 
              className="rounded-xl px-6 font-bold shadow-lg shadow-primary/20"
              disabled={loading || !!error}
              onClick={() => window.print()}
            >
              <Printer className="w-4 h-4 mr-1.5" />
              Print / Save PDF
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
