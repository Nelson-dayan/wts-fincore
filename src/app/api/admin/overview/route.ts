import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connect";
import {
  ActivityLogModel,
  ClientModel,
  ExpenseModel,
  InvoiceModel,
  PaymentModel,
  ProjectModel,
  PurchaseOrderModel,
  QuotationModel,
  UserModel,
} from "@/lib/db/models";
import { requireRole } from "@/lib/auth/require-role";

export async function GET() {
  try {
    await requireRole(["admin"]);
    await connectDB();

    const [
      users,
      clients,
      projects,
      quotations,
      purchaseOrders,
      invoices,
      payments,
      expenses,
      activityLogs,
    ] = await Promise.all([
      UserModel.countDocuments(),
      ClientModel.countDocuments(),
      ProjectModel.countDocuments(),
      QuotationModel.countDocuments(),
      PurchaseOrderModel.countDocuments(),
      InvoiceModel.countDocuments(),
      PaymentModel.countDocuments(),
      ExpenseModel.countDocuments(),
      ActivityLogModel.countDocuments(),
    ]);

    return NextResponse.json({
      users,
      clients,
      projects,
      quotations,
      purchaseOrders,
      invoices,
      payments,
      expenses,
      activityLogs,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(
      { message: "Failed to load admin overview" },
      { status: 500 }
    );
  }
}
