import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { InvoiceModel, ProjectModel, PurchaseOrderModel, QuotationModel } from "@/lib/db/models";
import { requireRole } from "@/lib/auth/require-role";
import { getEmployeeAssignedProjectIdStrings } from "@/lib/auth/employee-resource-access";

export async function GET() {
  try {
    const session = await requireRole(["admin", "employee"]);
    await connectDB();

    const userId = session.user.id;

    const projectIds = await getEmployeeAssignedProjectIdStrings(userId);

    const [myProjects, myQuotations, myPurchaseOrders, myInvoices] = await Promise.all([
      ProjectModel.find({ assignedTo: userId })
        .select("name status priority updatedAt")
        .sort({ updatedAt: -1 })
        .limit(8)
        .lean(),
      projectIds.length === 0
        ? Promise.resolve([])
        : QuotationModel.find({ projectId: { $in: projectIds } })
            .select("quotationNumber status projectId createdAt")
            .sort({ createdAt: -1 })
            .limit(8)
            .lean(),
      projectIds.length === 0
        ? Promise.resolve([])
        : PurchaseOrderModel.find({ projectId: { $in: projectIds } })
            .select("poNumber status projectId createdAt")
            .sort({ createdAt: -1 })
            .limit(8)
            .lean(),
      projectIds.length === 0
        ? Promise.resolve([])
        : InvoiceModel.find({ projectId: { $in: projectIds } })
            .select("invoiceNumber status dueDate projectId createdAt")
            .sort({ createdAt: -1 })
            .limit(8)
            .lean(),
    ]);

    return NextResponse.json({ myProjects, myQuotations, myPurchaseOrders, myInvoices });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(
      { message: "Failed to load employee overview" },
      { status: 500 }
    );
  }
}
