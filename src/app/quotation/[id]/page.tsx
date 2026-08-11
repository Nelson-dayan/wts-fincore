"use client";

import React, { useEffect, useState, use } from "react";
import { CheckCircle, XCircle, FileText, Building2, Calendar, ShieldCheck, Download, AlertCircle } from "lucide-react";

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

export default function PublicQuotationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
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
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="flex items-center space-x-3 bg-slate-900/80 border border-slate-800 px-6 py-4 rounded-xl shadow-xl backdrop-blur-md">
          <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium text-slate-300">Loading Official Document...</span>
        </div>
      </div>
    );
  }

  if (error || !quotation) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900/90 border border-rose-500/20 rounded-2xl p-8 text-center shadow-2xl backdrop-blur-md">
          <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-100 mb-2">Quotation Not Found</h2>
          <p className="text-slate-400 text-sm mb-6">{error || "The requested quotation URL is invalid or has been revoked."}</p>
        </div>
      </div>
    );
  }

  const items = quotation.pages?.flatMap((p) => p.items) || [];
  const formatCurrency = (amt: number = 0) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: quotation.currency || "AED",
    }).format(amt);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Branding */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center font-bold text-white text-xl shadow-lg shadow-indigo-500/20">
              {quotation.companyId?.code || "SDT"}
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-100">
                {quotation.companyId?.branding?.logoText || quotation.companySnapshot?.name || "Sec-DocuTrade"}
              </h1>
              <p className="text-xs text-slate-400">Official Financial & Trade Proposal</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                actionDone === "approved" || quotation.status === "approved"
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : actionDone === "rejected" || quotation.status === "rejected"
                  ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                  : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
              }`}
            >
              Status: {actionDone || quotation.status}
            </span>
          </div>
        </div>

        {/* Action Confirmation Banner */}
        {actionDone && (
          <div
            className={`p-6 rounded-2xl border backdrop-blur-xl flex items-start space-x-4 shadow-xl ${
              actionDone === "approved"
                ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-200"
                : "bg-rose-950/40 border-rose-500/30 text-rose-200"
            }`}
          >
            {actionDone === "approved" ? (
              <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div>
              <h3 className="font-semibold text-base mb-1">
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
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-8">
          {/* Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-slate-800 pb-6 text-sm">
            <div className="space-y-2">
              <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">Billed To</span>
              <p className="font-semibold text-slate-200 text-base">{quotation.clientSnapshot?.name || "Client Enterprise"}</p>
              {quotation.clientSnapshot?.address && (
                <p className="text-xs text-slate-400">{quotation.clientSnapshot.address}</p>
              )}
              {quotation.projectId?.name && (
                <p className="text-xs text-indigo-400 font-medium pt-1">
                  Project: {quotation.projectId.name}
                </p>
              )}
            </div>

            <div className="space-y-2 md:text-right">
              <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">Document Reference</span>
              <p className="font-mono font-bold text-slate-100 text-lg">{quotation.quotationNumber}</p>
              {quotation.documentInfo?.date && (
                <p className="text-xs text-slate-400 flex items-center md:justify-end gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Date: {new Date(quotation.documentInfo.date).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-3">
            <h3 className="text-xs uppercase tracking-wider font-semibold text-slate-400">Proposal Scope & Pricing</h3>
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 text-xs uppercase font-medium">
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Item Description</th>
                    <th className="py-3 px-4 text-center">Qty</th>
                    <th className="py-3 px-4 text-right">Unit Price</th>
                    <th className="py-3 px-4 text-right">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-mono text-xs text-slate-400">{item.number || idx + 1}</td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-200">{item.name}</div>
                        {item.description && <div className="text-xs text-slate-400 mt-0.5">{item.description}</div>}
                      </td>
                      <td className="py-3 px-4 text-center font-mono">{item.quantity}</td>
                      <td className="py-3 px-4 text-right font-mono">{formatCurrency(item.price)}</td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-100">
                        {formatCurrency((item.quantity || 1) * (item.price || 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals Summary */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 pt-4 border-t border-slate-800">
            <div className="text-xs text-slate-400 max-w-xs space-y-1">
              <p className="font-medium text-slate-300">Terms & Conditions</p>
              <p>{quotation.companyId?.branding?.invoiceFooter || "Standard commercial terms apply. Valid for 30 days."}</p>
            </div>

            <div className="w-full sm:w-64 bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2 text-sm">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal</span>
                <span className="font-mono">{formatCurrency(quotation.totals?.subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>VAT / Tax</span>
                <span className="font-mono">{formatCurrency(quotation.totals?.tax)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-slate-100 border-t border-slate-800 pt-2">
                <span>Grand Total</span>
                <span className="font-mono text-indigo-400">{formatCurrency(quotation.totals?.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Client Decision Section */}
        {!actionDone && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
            <div className="flex items-center space-x-2 text-indigo-400">
              <ShieldCheck className="w-5 h-5" />
              <h3 className="font-bold text-slate-100">Client Approval Authorization</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Authorized Contact Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Optional Notes / Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Approved for Phase 1 kickoff"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                onClick={() => handleAction("approved")}
                disabled={submitting}
                className="w-full sm:w-auto flex-1 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-semibold py-3 px-6 rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <CheckCircle className="w-5 h-5" />
                <span>Approve & Accept Proposal</span>
              </button>

              <button
                onClick={() => handleAction("rejected")}
                disabled={submitting}
                className="w-full sm:w-auto bg-slate-950 hover:bg-rose-950/40 text-rose-400 hover:text-rose-300 border border-slate-800 hover:border-rose-500/30 font-semibold py-3 px-6 rounded-xl transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <XCircle className="w-5 h-5" />
                <span>Decline Proposal</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
