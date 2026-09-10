import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { connectDB } from "@/lib/db/connect";
import { PaymentModel, PaymentAllocationModel } from "@/lib/db/models";
import { authErrorResponse } from "@/lib/api/route-auth";
import { deletePayment } from "@/lib/services/business/payment.service";

import { authorizeResource } from "@/lib/auth/authorization";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    await connectDB();
    const { paymentId } = await params;
    
    const item = await PaymentModel.findById(paymentId)
      .populate("invoiceId", "invoiceNumber status totalsCache companyId")
      .populate("createdBy", "name email")
      .lean();
      
    if (!item || item.isDeleted) {
      return NextResponse.json({ message: "Payment not found" }, { status: 404 });
    }

    const auth = await authorizeResource({
      permission: "payments.view",
      companyId: item.companyId ? String(item.companyId) : (item.invoiceId as any)?.companyId ? String((item.invoiceId as any).companyId) : undefined,
      projectId: item.projectId ? String(item.projectId) : undefined,
    });
    if (!auth.authorized) {
      return authErrorResponse({ message: auth.reason, code: auth.code }, "Access denied");
    }

    // Fetch associated allocations
    const allocations = await PaymentAllocationModel.find({ paymentId })
      .populate("invoiceId", "invoiceNumber status totalsCache")
      .lean();

    const itemObj = item as any;
    itemObj.allocations = allocations;

    // Fallback for referenceNumber from transactionId
    if (!itemObj.referenceNumber && itemObj.transactionId) {
      itemObj.referenceNumber = itemObj.transactionId;
    }

    // Dynamic fallback for invoiceId if not set directly (e.g. multi-allocation)
    if (!itemObj.invoiceId && allocations.length > 0) {
      itemObj.invoiceId = allocations[0].invoiceId;
    }

    // Convert Mongoose Decimal128 to numbers for React rendering
    const sanitized = JSON.parse(JSON.stringify(itemObj), (key, value) => {
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
    await connectDB();
    const { paymentId } = await params;
    
    if (!paymentId) {
      return NextResponse.json({ message: "paymentId is required" }, { status: 400 });
    }

    const item = await PaymentModel.findById(paymentId).select("companyId projectId").lean();
    if (!item) {
      return NextResponse.json({ message: "Payment not found" }, { status: 404 });
    }

    const auth = await authorizeResource({
      permission: "payments.delete",
      companyId: item.companyId ? String(item.companyId) : undefined,
      projectId: item.projectId ? String(item.projectId) : undefined,
    });
    if (!auth.authorized) {
      return authErrorResponse({ message: auth.reason, code: auth.code }, "Access denied");
    }

    const result = await deletePayment(paymentId, auth.context.userId);
    return NextResponse.json(result);
  } catch (error) {
    return authErrorResponse(error, "Failed to delete payment");
  }
}
