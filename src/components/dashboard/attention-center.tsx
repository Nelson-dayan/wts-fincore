"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, FileText, Receipt, DollarSign, ArrowRight, Clock, ShieldAlert, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCan } from "@/lib/auth/use-can";

export interface WorkQueueItem {
  id: string;
  category: "Quotation Approval" | "Payment Processing" | "Expense Sign-off" | "Security Event";
  entityName: string;
  clientOrUser: string;
  amountDisplay?: string;
  ageText: string;
  severity: "high" | "medium" | "low";
  actionText: string;
  href: string;
  capabilityRequired?: string;
}

function calculateAge(dateStr?: string): string {
  if (!dateStr) return "Recent";
  const diffMs = new Date().getTime() - new Date(dateStr).getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `Waiting ${diffDays} day${diffDays > 1 ? "s" : ""}`;
}

export function AttentionCenterWidget({ portal = "admin" }: { portal?: "admin" | "employee" }) {
  const { can } = useCan();
  const [items, setItems] = useState<WorkQueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadWorkQueue() {
      try {
        setLoading(true);
        const [quotesRes, invsRes, expRes] = await Promise.all([
          fetch(`/api/${portal}/quotations?limit=20`),
          fetch(`/api/${portal}/invoices?limit=20`),
          fetch(`/api/${portal}/expenses?limit=20`),
        ]);

        const queue: WorkQueueItem[] = [];

        if (quotesRes.ok) {
          const quotesData = await quotesRes.json();
          for (const q of (quotesData.items || [])) {
            if (q.status === "SENT" || q.status === "DRAFT") {
              const amount = q.totalAmount ? `AED ${Number(q.totalAmount).toLocaleString()}` : undefined;
              queue.push({
                id: `quote-${q._id}`,
                category: "Quotation Approval",
                entityName: `Quotation ${q.quotationNumber || "QT-Draft"}`,
                clientOrUser: q.clientName || q.clientCompany || "Client Account",
                amountDisplay: amount,
                ageText: calculateAge(q.createdAt),
                severity: q.status === "SENT" ? "high" : "medium",
                actionText: "Review",
                href: `/${portal}/quotations/${q._id}`,
                capabilityRequired: "quotations.approve",
              });
            }
          }
        }

        if (invsRes.ok) {
          const invsData = await invsRes.json();
          for (const inv of (invsData.items || [])) {
            if (inv.status === "ISSUED" || inv.status === "SENT") {
              const isOverdue = inv.dueDate && new Date(inv.dueDate) < new Date();
              const amount = inv.totalAmount ? `AED ${Number(inv.totalAmount).toLocaleString()}` : undefined;
              queue.push({
                id: `inv-${inv._id}`,
                category: "Payment Processing",
                entityName: `Invoice ${inv.invoiceNumber || "INV"}`,
                clientOrUser: isOverdue ? "OVERDUE PAYMENT" : "Awaiting Settlement",
                amountDisplay: amount,
                ageText: isOverdue ? "Overdue" : calculateAge(inv.createdAt),
                severity: isOverdue ? "high" : "medium",
                actionText: "Process",
                href: `/${portal}/invoices/${inv._id}`,
                capabilityRequired: "invoices.markPaid",
              });
            }
          }
        }

        if (expRes.ok) {
          const expData = await expRes.json();
          for (const ex of (expData.items || [])) {
            if (ex.status === "SUBMITTED") {
              const amount = ex.amount ? `${ex.currency || "AED"} ${Number(ex.amount).toLocaleString()}` : undefined;
              queue.push({
                id: `exp-${ex._id}`,
                category: "Expense Sign-off",
                entityName: `Expense: ${ex.title || "Claim"}`,
                clientOrUser: ex.submittedBy || "Team Member",
                amountDisplay: amount,
                ageText: calculateAge(ex.createdAt),
                severity: "medium",
                actionText: "Review",
                href: `/${portal}/expenses`,
                capabilityRequired: "expenses.approve",
              });
            }
          }
        }

        setItems(queue);
      } catch (err) {
        console.error("Failed to load work queue items:", err);
      } finally {
        setLoading(false);
      }
    }

    loadWorkQueue();
  }, [portal]);

  const filteredItems = items.filter((item) => {
    if (!item.capabilityRequired) return true;
    return can(item.capabilityRequired as any);
  });

  return (
    <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/[0.03] via-card to-card shadow-sm overflow-hidden mb-6">
      <CardHeader className="border-b border-border/50 bg-amber-500/[0.04] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-bold">Needs Your Attention</CardTitle>
              <p className="text-xs text-muted-foreground">Action queue prioritized by role and operational age</p>
            </div>
          </div>
          <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30">
            {filteredItems.length} Action{filteredItems.length !== 1 ? "s" : ""} Pending
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-8 text-xs text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            <span className="font-medium">Work queue clear! All operational actions are complete.</span>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-border/60 bg-card p-4 hover:border-amber-500/40 transition-colors shadow-2xs"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-0.5 flex h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                        {item.category}
                      </span>
                      <span className="text-muted-foreground/40">•</span>
                      <span className="text-xs font-bold text-foreground truncate">{item.entityName}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <span>{item.clientOrUser}</span>
                      {item.amountDisplay && (
                        <>
                          <span className="text-muted-foreground/40">•</span>
                          <span className="font-semibold text-foreground font-mono">{item.amountDisplay}</span>
                        </>
                      )}
                      <span className="text-muted-foreground/40">•</span>
                      <span className="flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                        <Clock className="h-3 w-3" />
                        {item.ageText}
                      </span>
                    </div>
                  </div>
                </div>

                <Link href={item.href} className="shrink-0 self-end sm:self-center">
                  <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs rounded-xl border-amber-500/30 hover:bg-amber-500/10">
                    {item.actionText}
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
