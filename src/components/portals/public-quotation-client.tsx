"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle, XCircle, Calendar, ShieldCheck, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils/formatters";
import { StatusBadge } from "@/components/ui/status-badge";

interface QuotationItem {
  number: number;
  name: string;
  description?: string;
  quantity: number;
  price: number;
}

interface QuotationPage {
  pageNumber: number;
  items: QuotationItem[];
}

interface PublicQuotation {
  _id: string;
  quotationNumber: string;
  status: "draft" | "sent" | "approved" | "rejected";
  currency: string;
  documentInfo?: {
    date?: string;
  };
  clientSnapshot?: {
    name?: string;
    address?: string;
  };
  companySnapshot?: {
    name?: string;
    address?: string;
  };
  companyId?: {
    name?: string;
    code?: string;
    branding?: {
      logoText?: string;
      invoiceFooter?: string;
    };
  };
  projectId?: {
    name?: string;
    code?: string;
  };
  pages?: QuotationPage[];
  totals?: {
    subtotal: number;
    tax: number;
    total: number;
  };
  internalNotes?: string;
}

export function PublicQuotationClient({ id }: { id: string }) {
  const [quotation, setQuotation] = useState<PublicQuotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [contactName, setContactName] = useState("");
  const [note, setNote] = useState("");
  const [actionDone, setActionDone] = useState<"approved" | "rejected" | null>(null);

  useEffect(() => {
    async function fetchQuotation() {
      try {
        const res = await fetch(`/api/public/quotations/${id}`);
        if (!res.ok) {
          throw new Error("Quotation not found or link expired.");
        }
        const data = await res.json();
        setQuotation(data.quotation);
        if (data.quotation?.status === "approved" || data.quotation?.status === "rejected") {
          setActionDone(data.quotation.status);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load quotation.");
      } finally {
        setLoading(false);
      }
    }
    fetchQuotation();
  }, [id]);

  const handleAction = async (newStatus: "approved" | "rejected") => {
    if (!contactName.trim()) {
      alert("Please enter your name for confirmation.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/public/quotations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          clientContactName: contactName,
          clientNote: note,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit decision.");
      }

      setActionDone(newStatus);
      if (quotation) {
        setQuotation({ ...quotation, status: newStatus });
      }
    } catch (err: any) {
      alert(err.message || "Failed to submit decision.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <div className="flex items-center space-x-3 bg-card border border-border/80 px-6 py-4 rounded-xl shadow-xs">
          <div className="size-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-muted-foreground">Loading Official Document...</span>
        </div>
      </div>
    );
  }

  if (error || !quotation) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-card border border-destructive/30 rounded-2xl p-8 text-center shadow-xs">
          <AlertCircle className="size-12 text-destructive mx-auto mb-4" />
          <h2 className="text-lg font-bold text-foreground mb-2">Quotation Not Found</h2>
          <p className="text-muted-foreground text-xs mb-6">{error || "The requested quotation URL is invalid or has been revoked."}</p>
        </div>
      </div>
    );
  }

  const items = quotation.pages?.flatMap((p) => p.items) || [];
  const curr = quotation.currency || "AED";

  return (
    <div className="min-h-screen bg-background text-foreground py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Branding */}
        <div className="bg-card border border-border/80 rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div className="size-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary text-xl">
              {quotation.companyId?.code || "SDT"}
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                {quotation.companyId?.branding?.logoText || quotation.companySnapshot?.name || "Sec-DocuTrade"}
              </h1>
              <p className="text-xs text-muted-foreground">Official Commercial Proposal</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <StatusBadge status={actionDone || quotation.status} size="md" />
          </div>
        </div>

        {/* Action Confirmation Banner */}
        {actionDone && (
          <div
            className={`p-6 rounded-2xl border flex items-start space-x-4 shadow-xs ${
              actionDone === "approved"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                : "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
            }`}
          >
            {actionDone === "approved" ? (
              <CheckCircle className="size-6 text-emerald-500 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="size-6 text-rose-500 shrink-0 mt-0.5" />
            )}
            <div>
              <h3 className="font-bold text-base mb-1">
                {actionDone === "approved"
                  ? "Quotation Accepted & Approved"
                  : "Quotation Declined"}
              </h3>
              <p className="text-xs leading-relaxed opacity-90">
                {actionDone === "approved"
                  ? "Thank you for approving this proposal. A Purchase Order reference has been generated and our account manager will be in touch shortly."
                  : "You have declined this quotation. Our sales team has been notified of your response."}
              </p>
            </div>
          </div>
        )}

        {/* Document Details Card */}
        <div className="bg-card border border-border/80 rounded-2xl p-6 sm:p-8 shadow-xs space-y-8">
          {/* Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-border/60 pb-6 text-xs">
            <div className="space-y-2">
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">Billed To</span>
              <p className="font-bold text-foreground text-sm">{quotation.clientSnapshot?.name || "Client Enterprise"}</p>
              {quotation.clientSnapshot?.address && (
                <p className="text-xs text-muted-foreground">{quotation.clientSnapshot.address}</p>
              )}
              {quotation.projectId?.name && (
                <p className="text-xs text-primary font-semibold pt-1">
                  Project: {quotation.projectId.name}
                </p>
              )}
            </div>

            <div className="space-y-2 md:text-right">
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">Document Reference</span>
              <p className="font-mono font-bold text-foreground text-base">{quotation.quotationNumber}</p>
              {quotation.documentInfo?.date && (
                <p className="text-xs text-muted-foreground flex items-center md:justify-end gap-1.5 font-mono">
                  <Calendar className="size-3.5 text-muted-foreground" />
                  Date: {new Date(quotation.documentInfo.date).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">Proposal Scope & Pricing</h3>
            <div className="overflow-x-auto rounded-xl border border-border/80">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/30 border-b border-border/80 text-muted-foreground text-[11px] uppercase font-semibold">
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Item Description</th>
                    <th className="py-3 px-4 text-center">Qty</th>
                    <th className="py-3 px-4 text-right">Unit Price</th>
                    <th className="py-3 px-4 text-right">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-foreground">
                  {items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4 font-mono text-xs text-muted-foreground">{item.number || idx + 1}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-foreground">{item.name}</div>
                        {item.description && <div className="text-xs text-muted-foreground mt-0.5">{item.description}</div>}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-semibold">{item.quantity}</td>
                      <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums">{formatCurrency(item.price, curr)}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold tabular-nums text-foreground">
                        {formatCurrency((item.quantity || 1) * (item.price || 0), curr)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals Summary */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 pt-4 border-t border-border/60">
            <div className="text-xs text-muted-foreground max-w-xs space-y-1">
              <p className="font-semibold text-foreground">Terms & Conditions</p>
              <p>{quotation.companyId?.branding?.invoiceFooter || "Standard commercial terms apply. Valid for 30 days."}</p>
            </div>

            <div className="w-full sm:w-72 bg-muted/20 p-4 rounded-xl border border-border/80 space-y-2 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-mono font-semibold tabular-nums">{formatCurrency(quotation.totals?.subtotal || 0, curr)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>VAT / Tax</span>
                <span className="font-mono font-semibold tabular-nums">{formatCurrency(quotation.totals?.tax || 0, curr)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-foreground border-t border-border/60 pt-2">
                <span>Grand Total</span>
                <span className="font-mono text-primary tabular-nums">{formatCurrency(quotation.totals?.total || 0, curr)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Client Decision Section */}
        {!actionDone && (
          <div className="bg-card border border-border/80 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center space-x-2 text-primary">
              <ShieldCheck className="size-5" />
              <h3 className="font-bold text-foreground text-sm">Client Approval Authorization</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Authorized Contact Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full bg-background border border-input rounded-lg px-3.5 py-2 text-xs text-foreground focus:outline-none focus:border-ring transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Optional Notes / Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Approved for Phase 1 kickoff"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full bg-background border border-input rounded-lg px-3.5 py-2 text-xs text-foreground focus:outline-none focus:border-ring transition-colors"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                onClick={() => handleAction("approved")}
                disabled={submitting}
                className="w-full sm:w-auto flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2.5 px-5 rounded-lg shadow-xs transition-all flex items-center justify-center space-x-2 text-xs disabled:opacity-50"
              >
                <CheckCircle className="size-4" />
                <span>Approve & Accept Proposal</span>
              </button>

              <button
                onClick={() => handleAction("rejected")}
                disabled={submitting}
                className="w-full sm:w-auto bg-background hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-border/80 hover:border-rose-500/30 font-semibold py-2.5 px-5 rounded-lg transition-all flex items-center justify-center space-x-2 text-xs disabled:opacity-50"
              >
                <XCircle className="size-4" />
                <span>Decline Proposal</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
