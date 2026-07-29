import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { InvoiceModel, QuotationModel, PurchaseOrderModel, ExpenseModel } from "@/lib/db/models";
import { requireRole } from "@/lib/auth/require-role";
import { decimalToNumber } from "@/lib/services/business/money";

export interface NotificationItem {
  id: string;
  type: "OVERDUE_INVOICE" | "PENDING_QUOTATION" | "OPEN_PO" | "HIGH_EXPENSE";
  title: string;
  description: string;
  severity: "high" | "medium" | "info";
  timestamp: string;
  actionUrl: string;
  read: boolean;
}

export async function GET() {
  try {
    await requireRole(["admin", "employee"]);
    await connectDB();

    const now = new Date();
    const notifications: NotificationItem[] = [];

    // 1. Overdue Invoices (High Priority - Need Attention)
    const overdueInvoices = await InvoiceModel.find({
      status: { $in: ["SENT", "PARTIAL", "OVERDUE"] },
      dueDate: { $lt: now },
      isDeleted: false,
    })
      .select("invoiceNumber dueDate totalBase status")
      .sort({ dueDate: 1 })
      .limit(5)
      .lean();

    overdueInvoices.forEach((inv) => {
      const daysOverdue = Math.ceil((now.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 3600 * 24));
      notifications.push({
        id: `inv-${inv._id}`,
        type: "OVERDUE_INVOICE",
        title: `Overdue Invoice #${inv.invoiceNumber}`,
        description: `Overdue by ${daysOverdue} day${daysOverdue > 1 ? "s" : ""}. Total amount: ₹${decimalToNumber(inv.totalBase).toLocaleString()}.`,
        severity: "high",
        timestamp: inv.dueDate ? new Date(inv.dueDate).toISOString() : new Date().toISOString(),
        actionUrl: `/admin/invoices/${inv._id}`,
        read: false,
      });
    });

    // 2. Pending Quotations needing review
    const pendingQuotations = await QuotationModel.find({
      status: { $in: ["SENT", "DRAFT"] },
      isDeleted: false,
    })
      .select("quotationNumber totalBase createdAt status")
      .sort({ createdAt: -1 })
      .limit(3)
      .lean();

    pendingQuotations.forEach((q) => {
      notifications.push({
        id: `q-${q._id}`,
        type: "PENDING_QUOTATION",
        title: `Quotation #${q.quotationNumber} pending approval`,
        description: `Status is ${q.status}. Total: ₹${decimalToNumber(q.totalBase).toLocaleString()}. Needs client follow-up.`,
        severity: "medium",
        timestamp: q.createdAt ? new Date(q.createdAt).toISOString() : new Date().toISOString(),
        actionUrl: `/admin/quotations/${q._id}`,
        read: false,
      });
    });

    // 3. Open POs awaiting receipt
    const openPOs = await PurchaseOrderModel.find({
      status: { $in: ["SENT", "ISSUED"] },
      isDeleted: false,
    })
      .select("poNumber totalBase createdAt status")
      .sort({ createdAt: -1 })
      .limit(3)
      .lean();

    openPOs.forEach((po) => {
      notifications.push({
        id: `po-${po._id}`,
        type: "OPEN_PO",
        title: `Purchase Order #${po.poNumber} issued`,
        description: `Awaiting delivery/receipt fulfillment. Amount: ₹${decimalToNumber(po.totalBase).toLocaleString()}.`,
        severity: "info",
        timestamp: po.createdAt ? new Date(po.createdAt).toISOString() : new Date().toISOString(),
        actionUrl: `/admin/purchase-orders/${po._id}`,
        read: false,
      });
    });

    // 4. High Value Expenses logged in last 7 days
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const highExpenses = await ExpenseModel.find({
      createdAt: { $gte: weekAgo },
      isDeleted: false,
    })
      .select("title category amountBase createdAt")
      .sort({ createdAt: -1 })
      .limit(3)
      .lean();

    highExpenses.forEach((ex) => {
      const amt = decimalToNumber((ex as any).amountBase || (ex as any).amount);
      if (amt >= 5000) {
        notifications.push({
          id: `ex-${ex._id}`,
          type: "HIGH_EXPENSE",
          title: `High Expense: ${ex.title}`,
          description: `Category: ${ex.category}. Amount logged: ₹${amt.toLocaleString()}.`,
          severity: "info",
          timestamp: ex.createdAt ? new Date(ex.createdAt).toISOString() : new Date().toISOString(),
          actionUrl: `/admin/expenses`,
          read: false,
        });
      }
    });

    return NextResponse.json({
      items: notifications,
      unreadCount: notifications.filter((n) => n.severity === "high" || n.severity === "medium").length,
    });
  } catch (error) {
    return NextResponse.json({ items: [], unreadCount: 0 });
  }
}
