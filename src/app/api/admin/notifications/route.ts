import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { 
  InvoiceModel, 
  QuotationModel, 
  PurchaseOrderModel, 
  ExpenseModel, 
  ProjectModel, 
  ClientModel,
  UserNotificationReadModel,
  CustomNotificationModel
} from "@/lib/db/models";
import { requireRole } from "@/lib/auth/require-role";
import { decimalToNumber } from "@/lib/services/business/money";

export interface NotificationItem {
  id: string;
  type: "OVERDUE_INVOICE" | "PENDING_QUOTATION" | "OPEN_PO" | "HIGH_EXPENSE" | "LOW_MARGIN_PROJECT" | "NEW_CLIENT" | "ANNOUNCEMENT";
  title: string;
  description: string;
  severity: "high" | "medium" | "info";
  timestamp: string;
  actionUrl: string;
  read: boolean;
  createdByName?: string;
}

export async function GET() {
  try {
    const session = await requireRole(["admin", "employee"]);
    await connectDB();

    const userId = session.user.id;
    const userRole = session.user.role;
    const now = new Date();

    // Fetch user-specific read & dismissed records
    const userStateRecords = await UserNotificationReadModel.find({ userId }).lean();
    const readSet = new Set<string>();
    const dismissedSet = new Set<string>();

    userStateRecords.forEach((r) => {
      if (r.readAt) readSet.add(r.notificationId);
      if (r.dismissed) dismissedSet.add(r.notificationId);
    });

    const rawNotifications: NotificationItem[] = [];

    // 1. Custom Broadcast / Announcement Notifications
    const customAnnouncements = await CustomNotificationModel.find({
      target: { $in: ["all", userRole] },
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    customAnnouncements.forEach((c) => {
      const notifId = `custom-${c._id}`;
      rawNotifications.push({
        id: notifId,
        type: "ANNOUNCEMENT",
        title: c.title,
        description: c.description,
        severity: c.severity || "info",
        timestamp: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
        actionUrl: c.actionUrl || "#",
        read: readSet.has(notifId),
        createdByName: c.createdByName || "Admin",
      });
    });

    // 2. Overdue Invoices (High Priority - Need Attention)
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
      const notifId = `inv-${inv._id}`;
      rawNotifications.push({
        id: notifId,
        type: "OVERDUE_INVOICE",
        title: `Overdue Invoice #${inv.invoiceNumber}`,
        description: `Overdue by ${daysOverdue} day${daysOverdue > 1 ? "s" : ""}. Total: ₹${decimalToNumber(inv.totalBase).toLocaleString()}.`,
        severity: "high",
        timestamp: inv.dueDate ? new Date(inv.dueDate).toISOString() : new Date().toISOString(),
        actionUrl: `/admin/invoices/${inv._id}`,
        read: readSet.has(notifId),
      });
    });

    // 3. Pending Quotations needing client follow-up
    const pendingQuotations = await QuotationModel.find({
      status: { $in: ["SENT", "DRAFT"] },
      isDeleted: false,
    })
      .select("quotationNumber totalBase createdAt status")
      .sort({ createdAt: -1 })
      .limit(4)
      .lean();

    pendingQuotations.forEach((q) => {
      const notifId = `q-${q._id}`;
      rawNotifications.push({
        id: notifId,
        type: "PENDING_QUOTATION",
        title: `Quotation #${q.quotationNumber} pending action`,
        description: `Status is ${q.status}. Total: ₹${decimalToNumber(q.totalBase).toLocaleString()}.`,
        severity: "medium",
        timestamp: q.createdAt ? new Date(q.createdAt).toISOString() : new Date().toISOString(),
        actionUrl: `/admin/quotations/${q._id}`,
        read: readSet.has(notifId),
      });
    });

    // 4. Open POs awaiting fulfillment
    const openPOs = await PurchaseOrderModel.find({
      status: { $in: ["SENT", "ISSUED"] },
      isDeleted: false,
    })
      .select("poNumber totalBase createdAt status")
      .sort({ createdAt: -1 })
      .limit(3)
      .lean();

    openPOs.forEach((po) => {
      const notifId = `po-${po._id}`;
      rawNotifications.push({
        id: notifId,
        type: "OPEN_PO",
        title: `Purchase Order #${po.poNumber} issued`,
        description: `Awaiting delivery/vendor fulfillment. Amount: ₹${decimalToNumber(po.totalBase).toLocaleString()}.`,
        severity: "info",
        timestamp: po.createdAt ? new Date(po.createdAt).toISOString() : new Date().toISOString(),
        actionUrl: `/admin/purchase-orders/${po._id}`,
        read: readSet.has(notifId),
      });
    });

    // 5. Active Projects Monitoring
    const activeProjects = await ProjectModel.find({ status: "active" })
      .select("name budget createdAt")
      .sort({ createdAt: -1 })
      .limit(3)
      .lean();

    activeProjects.forEach((proj) => {
      const notifId = `proj-${proj._id}`;
      const budgetNum = decimalToNumber(proj.budget);
      rawNotifications.push({
        id: notifId,
        type: "LOW_MARGIN_PROJECT",
        title: `Active Project: ${proj.name}`,
        description: `Project active with budget ₹${budgetNum ? budgetNum.toLocaleString() : "TBD"}. Review cost allocations.`,
        severity: "medium",
        timestamp: proj.createdAt ? new Date(proj.createdAt).toISOString() : new Date().toISOString(),
        actionUrl: `/admin/projects/${proj._id}`,
        read: readSet.has(notifId),
      });
    });

    // 6. High Value Expenses logged in last 7 days
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
      const notifId = `ex-${ex._id}`;
      if (amt >= 5000) {
        rawNotifications.push({
          id: notifId,
          type: "HIGH_EXPENSE",
          title: `High Expense: ${ex.title}`,
          description: `Category: ${ex.category}. Amount: ₹${amt.toLocaleString()}.`,
          severity: "info",
          timestamp: ex.createdAt ? new Date(ex.createdAt).toISOString() : new Date().toISOString(),
          actionUrl: `/admin/expenses`,
          read: readSet.has(notifId),
        });
      }
    });

    // 7. Recent Clients Onboarded
    const recentClients = await ClientModel.find({
      createdAt: { $gte: weekAgo },
    })
      .select("name companyName createdAt")
      .sort({ createdAt: -1 })
      .limit(2)
      .lean();

    recentClients.forEach((client) => {
      const notifId = `client-${client._id}`;
      rawNotifications.push({
        id: notifId,
        type: "NEW_CLIENT",
        title: `New Client Onboarded: ${client.name}`,
        description: `${client.companyName ? `Company: ${client.companyName}. ` : ""}Ready for project setup.`,
        severity: "info",
        timestamp: client.createdAt ? new Date(client.createdAt).toISOString() : new Date().toISOString(),
        actionUrl: `/admin/clients/${client._id}`,
        read: readSet.has(notifId),
      });
    });

    // Filter out notifications dismissed by THIS specific user
    const notifications = rawNotifications.filter((n) => !dismissedSet.has(n.id));

    // Sort unread & high-severity first, then by timestamp
    notifications.sort((a, b) => {
      if (a.read !== b.read) return a.read ? 1 : -1;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    const unreadCount = notifications.filter((n) => !n.read).length;

    return NextResponse.json({
      items: notifications,
      unreadCount,
      userRole,
    });
  } catch (error) {
    return NextResponse.json({ items: [], unreadCount: 0 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireRole(["admin", "employee"]);
    await connectDB();

    const userId = session.user.id;
    const body = await req.json();
    const { action, notificationId, markAll, notificationIds, title, description, severity, target, actionUrl } = body;

    // 1. Create Broadcast / Custom Notification (Admins Only)
    if (action === "create") {
      if (session.user.role !== "admin") {
        return NextResponse.json({ message: "Only admins can broadcast notifications" }, { status: 403 });
      }
      if (!title || !description) {
        return NextResponse.json({ message: "Title and description are required" }, { status: 400 });
      }
      const created = await CustomNotificationModel.create({
        title: String(title).trim(),
        description: String(description).trim(),
        severity: severity || "info",
        target: target || "all",
        actionUrl: String(actionUrl || "").trim(),
        createdBy: userId,
        createdByName: session.user.name || "Admin",
      });
      return NextResponse.json({ success: true, item: created }, { status: 201 });
    }

    // 2. Dismiss Notification for THIS User (Per-User Delete)
    if (action === "dismiss" && notificationId) {
      await UserNotificationReadModel.updateOne(
        { userId, notificationId },
        { $set: { userId, notificationId, readAt: new Date(), dismissed: true } },
        { upsert: true }
      );
      return NextResponse.json({ success: true, action: "dismissed" });
    }

    // 3. Mark All Read for THIS User
    if ((action === "markAllRead" || markAll) && Array.isArray(notificationIds)) {
      const docs = notificationIds.map((id: string) => ({
        updateOne: {
          filter: { userId, notificationId: id },
          update: { $set: { userId, notificationId: id, readAt: new Date() } },
          upsert: true,
        },
      }));
      if (docs.length > 0) {
        await UserNotificationReadModel.bulkWrite(docs);
      }
      return NextResponse.json({ success: true });
    }

    // 4. Mark Single Notification Read for THIS User
    if (notificationId) {
      await UserNotificationReadModel.updateOne(
        { userId, notificationId },
        { $set: { userId, notificationId, readAt: new Date(), dismissed: false } },
        { upsert: true }
      );
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ message: "Invalid request payload" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ message: "Failed to process notification action" }, { status: 500 });
  }
}
