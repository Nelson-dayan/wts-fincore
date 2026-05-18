import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { connectDB } from "@/lib/db/connect";
import { PaymentModel } from "@/lib/db/models";
import { authErrorResponse } from "@/lib/api/route-auth";
import { deletePayment } from "@/lib/services/business/payment.service";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    await requireRole(["admin", "employee"]);
    await connectDB();
    const { paymentId } = await params;
    
    const item = await PaymentModel.findById(paymentId)
      .populate("invoiceId", "invoiceNumber status totalsCache")
      .populate("createdBy", "name email")
      .lean();
      
    if (!item || item.isDeleted) {
      return NextResponse.json({ message: "Payment not found" }, { status: 404 });
    }

    // Convert Mongoose Decimal128 to numbers for React rendering
    const sanitized = JSON.parse(JSON.stringify(item), (key, value) => {
      if (value && typeof value === 'object' && value.$numberDecimal) {
        return parseFloat(value.$numberDecimal);
      }
      return value;
    });

    return NextResponse.json({ item: sanitized });
  } catch (error) {
    return authErrorResponse(error, "Failed to load payment detail");
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    const session = await requireRole(["admin"]);
    const { paymentId } = await params;
    
    if (!paymentId) {
      return NextResponse.json({ message: "paymentId is required" }, { status: 400 });
    }

    const result = await deletePayment(paymentId, session.user.id);
    return NextResponse.json(result);
  } catch (error) {
    return authErrorResponse(error, "Failed to delete payment");
  }
}
