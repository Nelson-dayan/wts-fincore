"use client";

import React from "react";
import { CheckCircle2, Clock, Send, ShieldAlert, FileText, ArrowRight, XCircle, Ban, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { useCan } from "@/lib/auth/use-can";

export type DocumentType = "quotation" | "purchase_order" | "invoice" | "expense";

interface StepConfig {
  key: string;
  label: string;
  description: string;
}

const LIFECYCLE_STEPS: Record<DocumentType, StepConfig[]> = {
  quotation: [
    { key: "DRAFT", label: "Draft", description: "Created & editable" },
    { key: "SENT", label: "Sent to Client", description: "Pending response" },
    { key: "APPROVED", label: "Approved", description: "Ready for PO conversion" },
    { key: "CONVERTED", label: "Converted", description: "Converted to Purchase Order" },
  ],
  purchase_order: [
    { key: "DRAFT", label: "Draft", description: "Internal review" },
    { key: "SENT", label: "Sent to Vendor", description: "Pending confirmation" },
    { key: "APPROVED", label: "Approved / Active", description: "Fulfillment in progress" },
  ],
  invoice: [
    { key: "DRAFT", label: "Draft", description: "Created" },
    { key: "ISSUED", label: "Issued", description: "Locked for billing" },
    { key: "SENT", label: "Sent to Client", description: "Payment pending" },
    { key: "PAID", label: "Paid", description: "Payment received & cleared" },
  ],
  expense: [
    { key: "SUBMITTED", label: "Submitted", description: "Pending manager approval" },
    { key: "APPROVED", label: "Approved", description: "Processed for reimbursement" },
  ],
};

interface DocumentLifecycleTrackerProps {
  type: DocumentType;
  currentStatus: string;
  documentId: string;
  documentNumber?: string;
  onAction?: (action: string) => Promise<void> | void;
  isProcessing?: boolean;
}

export function DocumentLifecycleTracker({
  type,
  currentStatus,
  documentId,
  documentNumber,
  onAction,
  isProcessing = false,
}: DocumentLifecycleTrackerProps) {
  const { can } = useCan();
  const steps = LIFECYCLE_STEPS[type] || [];
  const upperStatus = currentStatus ? currentStatus.toUpperCase() : "DRAFT";

  const isDeclined = upperStatus === "DECLINED" || upperStatus === "REJECTED";
  const isVoid = upperStatus === "VOID" || upperStatus === "CANCELLED";

  // Find index of current step
  const currentIndex = steps.findIndex((s) => s.key === upperStatus);

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm space-y-5">
      {/* Header & Status Indicator */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/50 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-semibold tracking-tight text-foreground">
              Document Lifecycle Tracker {documentNumber ? `• ${documentNumber}` : ""}
            </h4>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time workflow status and contextual legal action controls.
          </p>
        </div>

        {/* Status Pill & Action Ownership */}
        <div className="flex items-center gap-2 flex-wrap">
          {isDeclined ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive">
              <XCircle className="h-3.5 w-3.5" />
              {type === "expense" ? "Rejected" : "Declined"}
            </span>
          ) : isVoid ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-500/10 px-3 py-1 text-xs font-semibold text-slate-600 dark:text-slate-400">
              <Ban className="h-3.5 w-3.5" />
              {upperStatus}
            </span>
          ) : upperStatus === "PAID" || upperStatus === "APPROVED" || upperStatus === "CONVERTED" ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {upperStatus} • Complete
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Clock className="h-3.5 w-3.5 animate-pulse" />
              {upperStatus} • {
                upperStatus === "DRAFT" ? "Waiting for Author" :
                upperStatus === "SENT" ? (type === "quotation" ? "Waiting for Client" : "Waiting for Approval") :
                upperStatus === "ISSUED" ? "Waiting for Finance" :
                upperStatus === "SUBMITTED" ? "Waiting for Manager" : "In Progress"
              }
            </span>
          )}
        </div>
      </div>

      {/* Step Progression Bar */}
      {!isDeclined && !isVoid && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {steps.map((step, idx) => {
            const isCompleted = currentIndex > idx || upperStatus === "CONVERTED" || upperStatus === "PAID";
            const isCurrent = currentIndex === idx;

            return (
              <div
                key={step.key}
                className={cn(
                  "relative flex flex-col rounded-xl p-3 border transition-all",
                  isCurrent
                    ? "border-primary/50 bg-primary/[0.06] dark:bg-primary/[0.12] shadow-sm"
                    : isCompleted
                    ? "border-emerald-500/30 bg-emerald-500/[0.03] text-foreground"
                    : "border-border/40 bg-muted/20 opacity-60"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">
                    Step 0{idx + 1}
                  </span>
                  {isCompleted ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  ) : isCurrent ? (
                    <span className="h-2 w-2 rounded-full bg-primary animate-ping" />
                  ) : null}
                </div>
                <span className={cn("text-xs font-semibold", isCurrent ? "text-primary" : "text-foreground")}>
                  {step.label}
                </span>
                <span className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                  {step.description}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Contextual Action Buttons Gated by Capability */}
      {onAction && (
        <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-border/50">
          {/* QUOTATION ACTIONS */}
          {type === "quotation" && (
            <>
              {upperStatus === "DRAFT" && can("quotations.send") && (
                <Button
                  size="sm"
                  onClick={() => onAction("send")}
                  disabled={isProcessing}
                  className="rounded-xl gap-1.5 shadow-sm"
                >
                  <Send className="h-3.5 w-3.5" />
                  Send to Client
                </Button>
              )}
              {upperStatus === "SENT" && (
                <>
                  {can("quotations.approve") && (
                    <Button
                      size="sm"
                      onClick={() => onAction("approve")}
                      disabled={isProcessing}
                      className="rounded-xl gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Approve Quotation
                    </Button>
                  )}
                  {can("quotations.reject") && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onAction("reject")}
                      disabled={isProcessing}
                      className="rounded-xl gap-1.5 text-destructive hover:bg-destructive/10"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Decline
                    </Button>
                  )}
                </>
              )}
              {upperStatus === "APPROVED" && can("quotations.convert") && (
                <Button
                  size="sm"
                  onClick={() => onAction("convert")}
                  disabled={isProcessing}
                  className="rounded-xl gap-1.5 bg-primary text-primary-foreground shadow-md"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                  Convert to Purchase Order
                </Button>
              )}
            </>
          )}

          {/* INVOICE ACTIONS */}
          {type === "invoice" && (
            <>
              {upperStatus === "DRAFT" && can("invoices.issue") && (
                <Button
                  size="sm"
                  onClick={() => onAction("issue")}
                  disabled={isProcessing}
                  className="rounded-xl gap-1.5 shadow-sm"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Issue Invoice
                </Button>
              )}
              {upperStatus === "ISSUED" && can("invoices.send") && (
                <Button
                  size="sm"
                  onClick={() => onAction("send")}
                  disabled={isProcessing}
                  className="rounded-xl gap-1.5 shadow-sm"
                >
                  <Send className="h-3.5 w-3.5" />
                  Send Invoice
                </Button>
              )}
              {(upperStatus === "ISSUED" || upperStatus === "SENT") && can("invoices.markPaid") && (
                <Button
                  size="sm"
                  onClick={() => onAction("markPaid")}
                  disabled={isProcessing}
                  className="rounded-xl gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  Mark as Paid
                </Button>
              )}
              {(upperStatus === "ISSUED" || upperStatus === "SENT") && can("invoices.void") && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onAction("void")}
                  disabled={isProcessing}
                  className="rounded-xl gap-1.5 text-destructive hover:bg-destructive/10"
                >
                  <Ban className="h-3.5 w-3.5" />
                  Void Invoice
                </Button>
              )}
            </>
          )}

          {/* PURCHASE ORDER ACTIONS */}
          {type === "purchase_order" && (
            <>
              {upperStatus === "DRAFT" && can("purchaseOrders.send") && (
                <Button
                  size="sm"
                  onClick={() => onAction("send")}
                  disabled={isProcessing}
                  className="rounded-xl gap-1.5 shadow-sm"
                >
                  <Send className="h-3.5 w-3.5" />
                  Send to Vendor
                </Button>
              )}
              {upperStatus === "SENT" && can("purchaseOrders.approve") && (
                <Button
                  size="sm"
                  onClick={() => onAction("approve")}
                  disabled={isProcessing}
                  className="rounded-xl gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Approve PO
                </Button>
              )}
              {upperStatus !== "CANCELLED" && can("purchaseOrders.cancel") && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onAction("cancel")}
                  disabled={isProcessing}
                  className="rounded-xl gap-1.5 text-destructive hover:bg-destructive/10"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Cancel PO
                </Button>
              )}
            </>
          )}

          {/* EXPENSE ACTIONS */}
          {type === "expense" && upperStatus === "SUBMITTED" && (
            <>
              {can("expenses.approve") && (
                <Button
                  size="sm"
                  onClick={() => onAction("approve")}
                  disabled={isProcessing}
                  className="rounded-xl gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Approve Expense
                </Button>
              )}
              {can("expenses.reject") && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onAction("reject")}
                  disabled={isProcessing}
                  className="rounded-xl gap-1.5 text-destructive hover:bg-destructive/10"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Reject
                </Button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
