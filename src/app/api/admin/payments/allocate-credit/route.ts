import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireRole } from "@/lib/auth/require-role";
import { connectDB } from "@/lib/db/connect";
import { PaymentModel, PaymentAllocationModel, InvoiceModel } from "@/lib/db/models";
import { allocate } from "@/lib/services/finance/allocation.engine";
import { decimalToNumber } from "@/lib/services/business/money";
import { convertToBase } from "@/lib/services/finance/exchange.engine";

export async function POST(req: Request) {
  try {
    const session = await requireRole(["admin", "employee"]);
    await connectDB();

    const { paymentId, invoiceId, amount } = (await req.json()) as {
      paymentId: string;
      invoiceId: string;
      amount: number;
    };

    if (!paymentId || !invoiceId || amount <= 0) {
      return NextResponse.json({ message: "Invalid parameters" }, { status: 400 });
    }

    // 1. Fetch Payment & Invoice
    const payment = await PaymentModel.findOne({ _id: paymentId, isDeleted: { $ne: true } });
    if (!payment) {
      return NextResponse.json({ message: "Payment not found" }, { status: 404 });
    }

    const invoice = await InvoiceModel.findOne({ _id: invoiceId, isDeleted: { $ne: true } });
    if (!invoice) {
      return NextResponse.json({ message: "Invoice not found" }, { status: 404 });
    }

    // 2. Verify that this client matches
    if (String(payment.clientId) !== String(invoice.clientSnapshot?.id || (invoice as any).clientId)) {
      return NextResponse.json({ message: "Client mismatch between payment and invoice" }, { status: 400 });
    }

    // 3. Compute available credit on this payment
    const allocations = await PaymentAllocationModel.find({ paymentId });
    const totalAllocatedBase = allocations.reduce((sum, a) => sum + decimalToNumber(a.allocatedAmountBase), 0);
    const paymentAmountBase = decimalToNumber(payment.amountBase);
    const availableCreditBase = Math.max(0, paymentAmountBase - totalAllocatedBase);

    // 4. Calculate requested allocation base (INR)
    // Rate to convert Invoice Currency to Base INR
    // If invoice doesn't specify, we use exchangeRateToBase or static rate
    const invCurrency = String(invoice.currency || (invoice as any).invoiceType || "AED").toUpperCase();
    const invoiceRateToBase = decimalToNumber((invoice as any).totalsCache?.totalIntendedBase) / decimalToNumber((invoice.totals as any)?.total || 1) || 1.0;
    
    const requestedAllocationBase = convertToBase(amount, invoiceRateToBase);

    // Safety check with a 0.05 currency rounding tolerance
    if (requestedAllocationBase - availableCreditBase > 0.05) {
      return NextResponse.json({
        message: `Insufficient credit on this payment. Available: ₹${availableCreditBase.toFixed(2)}, Requested: ₹${requestedAllocationBase.toFixed(2)}`
      }, { status: 400 });
    }

    // 5. Establish conversion rate from payment currency to invoice currency
    const payCurrency = String(payment.currency).toUpperCase();
    const rateUsed = decimalToNumber(payment.exchangeRateToBase) > 0 
      ? (invoiceRateToBase / decimalToNumber(payment.exchangeRateToBase)) 
      : 1.0;

    // 6. Execute atomic allocation transaction
    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();
    try {
      await allocate(
        paymentId,
        invoiceId,
        amount,
        rateUsed,
        invoiceRateToBase,
        session.user.id,
        dbSession
      );
      await dbSession.commitTransaction();
    } catch (txError) {
      await dbSession.abortTransaction();
      throw txError;
    } finally {
      await dbSession.endSession();
    }

    return NextResponse.json({
      success: true,
      message: "Credit allocated successfully"
    });
  } catch (error) {
    console.error("CREDIT ALLOCATION ERROR:", error);
    return NextResponse.json({ message: "Failed to allocate credit" }, { status: 500 });
  }
}
