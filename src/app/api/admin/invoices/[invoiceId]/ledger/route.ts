import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { connectDB } from "@/lib/db/connect";
import { InvoiceModel, PaymentModel } from "@/lib/db/models";
import { authErrorResponse } from "@/lib/api/route-auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    await requireRole(["admin", "employee"]);
    await connectDB();
    const { invoiceId } = await params;
    
    const invoice = await InvoiceModel.findById(invoiceId)
      .populate("projectId", "name fixCurrency")
      .lean();
      
    if (!invoice) {
      return NextResponse.json({ message: "Invoice not found" }, { status: 404 });
    }

    const payments = await PaymentModel.find({ 
      invoiceId, 
      isDeleted: { $ne: true } 
    })
    .sort({ createdAt: 1 })
    .populate("createdBy", "name")
    .lean();

    // Function to recursively convert Decimal128 to numbers
    const sanitize = (obj: any) => {
      return JSON.parse(JSON.stringify(obj), (key, value) => {
        if (value && typeof value === 'object' && value.$numberDecimal) {
          return parseFloat(value.$numberDecimal);
        }
        return value;
      });
    };

    return NextResponse.json({ 
      invoice: sanitize(invoice), 
      payments: sanitize(payments) 
    });
  } catch (error) {
    return authErrorResponse(error, "Failed to load invoice ledger");
  }
}
