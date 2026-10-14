import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { connectDB } from "@/lib/db/connect";
import { recordTransfer, approveTransfer, rejectTransfer } from "@/lib/services/finance/transfer.service";
import { authErrorResponse } from "@/lib/api/route-auth";

export async function POST(req: Request) {
  try {
    // Only Admin can perform bank transfers
    const session = await requireRole(["admin"]);
    await connectDB();
    const body = await req.json();

    // Required fields check
    const required = ["fromAccountId", "toAccountId", "fromAmount", "toAmount", "exchangeRate"];
    for (const field of required) {
      if (body[field] === undefined || body[field] === null || body[field] === "") {
        return NextResponse.json({ message: `${field} is required` }, { status: 400 });
      }
    }

    if (String(body.fromAccountId) === String(body.toAccountId)) {
      return NextResponse.json({ message: "Source and destination accounts must be different" }, { status: 400 });
    }

    const fromAmount = Number(body.fromAmount);
    const toAmount = Number(body.toAmount);
    const exchangeRate = Number(body.exchangeRate);
    const fees = body.fees !== undefined && body.fees !== null && body.fees !== "" ? Number(body.fees) : 0;

    // Finding #01: Validate strictly positive amounts and non-negative fees
    if (!Number.isFinite(fromAmount) || fromAmount <= 0) {
      return NextResponse.json(
        { message: "Source transfer amount (fromAmount) must be greater than zero" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(toAmount) || toAmount <= 0) {
      return NextResponse.json(
        { message: "Destination transfer amount (toAmount) must be greater than zero" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
      return NextResponse.json(
        { message: "Exchange rate must be greater than zero" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(fees) || fees < 0) {
      return NextResponse.json(
        { message: "Transfer fees cannot be negative" },
        { status: 400 }
      );
    }

    if (fees >= fromAmount) {
      return NextResponse.json(
        { message: `Transfer fees (${fees}) cannot be greater than or equal to source transfer amount (${fromAmount})` },
        { status: 400 }
      );
    }

    const payload = {
      fromAccountId: body.fromAccountId,
      toAccountId: body.toAccountId,
      fromAmount,
      toAmount,
      exchangeRate,
      fees,
      reference: body.reference || "",
      note: body.note || "",
      rateSource: body.rateSource,
      overrideReason: body.overrideReason || "",
      createdBy: session.user.id,
    };

    const result = await recordTransfer(payload);
    const statusCode = result.status === "PENDING_APPROVAL" ? 202 : 201;
    
    return NextResponse.json({ 
      success: true,
      status: result.status,
      item: {
        ...result,
        _id: result.transferId
      }
    }, { status: statusCode });
  } catch (error: any) {
    if (error?.message && (
      error.message.includes("must be greater than zero") ||
      error.message.includes("cannot be negative") ||
      error.message.includes("does not match exchange rate") ||
      error.message.includes("Same-currency transfers") ||
      error.message.includes("deviates excessively") ||
      error.message.includes("outside allowable system thresholds") ||
      error.message.includes("Source and destination accounts must be different") ||
      error.message.includes("Source account not found") ||
      error.message.includes("Destination account not found") ||
      error.message.includes("is inactive") ||
      error.message.includes("Ledger sanity check failed") ||
      error.message.includes("Transfer amounts exceed") ||
      error.message.includes("override reason") ||
      error.message.includes("A documented override reason") ||
      error.message.includes("Insufficient funds")
    )) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    return authErrorResponse(error, "Failed to record bank transfer");
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await requireRole(["admin"]);
    await connectDB();
    const body = await req.json();

    const { transferId, action, reason } = body;
    if (!transferId || !action) {
      return NextResponse.json({ message: "transferId and action are required" }, { status: 400 });
    }

    if (action === "approve") {
      const result = await approveTransfer({
        transferId,
        approverId: session.user.id,
      });
      return NextResponse.json({ success: true, item: result }, { status: 200 });
    } else if (action === "reject") {
      const result = await rejectTransfer({
        transferId,
        rejecterId: session.user.id,
        reason,
      });
      return NextResponse.json({ success: true, item: result }, { status: 200 });
    } else {
      return NextResponse.json({ message: `Invalid action "${action}". Must be "approve" or "reject".` }, { status: 400 });
    }
  } catch (error: any) {
    if (error?.message && (
      error.message.includes("not found") ||
      error.message.includes("Maker-checker violation") ||
      error.message.includes("only PENDING_APPROVAL") ||
      error.message.includes("inactive") ||
      error.message.includes("Ledger sanity check") ||
      error.message.includes("Insufficient funds")
    )) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    return authErrorResponse(error, "Failed to update transfer status");
  }
}
