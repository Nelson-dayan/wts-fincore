import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { ClientModel, PaymentModel, PaymentAllocationModel } from "@/lib/db/models";
import { authorizeResource } from "@/lib/auth/authorization";
import { authErrorResponse } from "@/lib/api/route-auth";
import { decimalToNumber } from "@/lib/services/business/money";
import { convertBaseToTreasury } from "@/lib/services/finance/forex.engine";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    await connectDB();
    const { clientId } = await params;

    const existingClient = await ClientModel.findById(clientId).select("companyId").lean();
    if (!existingClient) {
      return NextResponse.json({ message: "Client not found" }, { status: 404 });
    }

    const auth = await authorizeResource({
      permission: "clients.view",
      companyId: existingClient.companyId ? String(existingClient.companyId) : undefined,
      clientId,
    });
    if (!auth.authorized) {
      return authErrorResponse({ message: auth.reason, code: auth.code }, "Access denied");
    }

    // 1. Fetch confirmed incoming non-deleted payments for this client
    const payments = await PaymentModel.find({
      clientId,
      direction: "INCOMING",
      type: "PAYMENT",
      isDeleted: { $ne: true }
    }).lean();

    const paymentIds = payments.map(p => p._id);

    // 2. Fetch all active allocations for these payments
    const allocations = await PaymentAllocationModel.find({
      paymentId: { $in: paymentIds }
    }).lean();

    // 3. Group allocations by paymentId to compute allocated amount in base currency (INR)
    const allocationsByPayment = new Map<string, number>();
    for (const a of allocations) {
      const pId = String(a.paymentId);
      const amtBase = decimalToNumber(a.allocatedAmountBase);
      allocationsByPayment.set(pId, (allocationsByPayment.get(pId) || 0) + amtBase);
    }

    // 4. Sum up unallocated balances
    let totalCreditBase = 0;
    const creditCarryingPayments = [];

    for (const p of payments) {
      const pId = String(p._id);
      const netAmtBase = decimalToNumber(p.amountBase);
      const allocatedBase = allocationsByPayment.get(pId) || 0;
      const unallocatedBase = Math.max(0, netAmtBase - allocatedBase);

      if (unallocatedBase > 0.01) {
        totalCreditBase += unallocatedBase;
        
        const exchangeRateToBase = decimalToNumber(p.exchangeRateToBase) || 1.0;
        const conv = convertBaseToTreasury({
          baseAmount: unallocatedBase,
          treasuryCurrency: p.currency,
          rates: { [p.currency]: exchangeRateToBase, INR: 1.0 }
        });
        creditCarryingPayments.push({
          paymentId: pId,
          referenceNumber: p.referenceNumber || p.transactionId || "No Reference",
          currency: p.currency,
          netAmount: decimalToNumber(p.amount),
          unallocatedAmount: conv.amount,
          unallocatedAmountBase: unallocatedBase,
          exchangeRateToBase,
          receivedAt: p.receivedAt,
        });
      }
    }

    // Sort by oldest received date (FIFO ready)
    creditCarryingPayments.sort((a, b) => new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime());

    return NextResponse.json({
      clientId,
      totalCreditBase,
      payments: creditCarryingPayments
    });
  } catch (error) {
    console.error("CLIENT CREDIT BALANCE ERROR:", error);
    return NextResponse.json({ message: "Failed to load client credit balance" }, { status: 500 });
  }
}
