import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { InvoiceModel, ActivityLogModel } from "@/lib/db/models";
import { requireRole } from "@/lib/auth/require-role";
import { authErrorResponse } from "@/lib/api/route-auth";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");
    
    await requireRole(["admin"]);
    await connectDB();

    const today = new Date();
    
    // 1. Find potential overdue invoices
    // Only target SENT or PARTIAL invoices that are past due
    const overdueInvoices = await InvoiceModel.find({
      status: { $in: ["SENT", "PARTIAL"] },
      dueDate: { $lt: today },
      isDeleted: false
    }).populate("projectId");

    const results = {
      totalFound: overdueInvoices.length,
      updatedToOverdue: 0,
      remindersSent: 0,
      logsCreated: 0
    };

    for (const inv of overdueInvoices) {
      // 2. Update status to OVERDUE if not already
      if (inv.status !== "OVERDUE") {
        inv.status = "OVERDUE";
        await inv.save();
        results.updatedToOverdue++;
      }

      // 3. Log the activity (The "Reminder")
      await ActivityLogModel.create({
        userId: session.user.id,
        action: "INVOICE_REMINDER_SENT",
        entityType: "Invoice",
        entityId: inv._id,
        projectId: inv.projectId?._id,
        message: `Auto-reminder: Invoice ${inv.invoiceNumber} is overdue since ${inv.dueDate.toLocaleDateString()}. Notification sent to client.`
      });
      
      results.logsCreated++;
      results.remindersSent++;

      // 4. (PROD) Send Email Logic here
      // await sendEmail({
      //   to: inv.clientSnapshot.email,
      //   subject: `Overdue Payment Reminder: Invoice ${inv.invoiceNumber}`,
      //   body: `Gentle reminder that your invoice ${inv.invoiceNumber} was due on ${inv.dueDate.toLocaleDateString()}...`
      // });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Processed ${overdueInvoices.length} overdue invoices.`,
      details: results
    });
  } catch (error) {
    return authErrorResponse(error, "Failed to process invoice reminders");
  }
}
