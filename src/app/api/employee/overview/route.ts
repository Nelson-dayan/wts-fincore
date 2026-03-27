import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { InvoiceModel, ProjectModel, QuotationModel } from "@/lib/db/models";
import { requireRole } from "@/lib/auth/require-role";

export async function GET() {
  try {
    const session = await requireRole(["admin", "employee"]);
    await connectDB();

    const userId = session.user.id;

    const [myProjects, myQuotations, myInvoices] = await Promise.all([
      ProjectModel.find({ assignedTo: userId })
        .select("name status priority updatedAt")
        .sort({ updatedAt: -1 })
        .limit(8)
        .lean(),
      QuotationModel.find({ createdBy: userId })
        .select("quotationNumber status projectId createdAt")
        .sort({ createdAt: -1 })
        .limit(8)
        .lean(),
      InvoiceModel.find({ createdBy: userId })
        .select("invoiceNumber status dueDate projectId createdAt")
        .sort({ createdAt: -1 })
        .limit(8)
        .lean(),
    ]);

    return NextResponse.json({ myProjects, myQuotations, myInvoices });
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
