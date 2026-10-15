import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { recordTransfer, approveTransfer, rejectTransfer } from "@/lib/services/finance/transfer.service";
import { authErrorResponse } from "@/lib/api/route-auth";
import { AccountModel, TransferModel } from "@/lib/db/models";
import { authorizeResource } from "@/lib/auth/authorization";

export async function POST(req: Request) {
  try {
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

    const fromAccount = await AccountModel.findById(body.fromAccountId).select("_id companyId name isActive").lean();
    if (!fromAccount) {
      return NextResponse.json({ message: "Source account not found" }, { status: 404 });
    }
    const toAccount = await AccountModel.findById(body.toAccountId).select("_id companyId name isActive").lean();
    if (!toAccount) {
      return NextResponse.json({ message: "Destination account not found" }, { status: 404 });
    }

    const authFrom = await authorizeResource({
      permission: "accounts.edit",
      companyId: fromAccount.companyId ? String(fromAccount.companyId) : undefined,
    });
    if (!authFrom.authorized) {
      return NextResponse.json({ message: authFrom.reason || "Forbidden for source account", code: authFrom.code }, { status: 403 });
    }

    const authTo = await authorizeResource({
      permission: "accounts.edit",
      companyId: toAccount.companyId ? String(toAccount.companyId) : undefined,
    });
    if (!authTo.authorized) {
      return NextResponse.json({ message: authTo.reason || "Forbidden for destination account", code: authTo.code }, { status: 403 });
    }

    const session = authFrom.session;

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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "";
    if (message && (
      message.includes("must be greater than zero") ||
      message.includes("cannot be negative") ||
      message.includes("does not match exchange rate") ||
      message.includes("Same-currency transfers") ||
      message.includes("deviates excessively") ||
      message.includes("outside allowable system thresholds") ||
      message.includes("Source and destination accounts must be different") ||
      message.includes("Source account not found") ||
      message.includes("Destination account not found") ||
      message.includes("is inactive") ||
      message.includes("Ledger sanity check failed") ||
      message.includes("Transfer amounts exceed") ||
      message.includes("override reason") ||
      message.includes("A documented override reason") ||
      message.includes("Insufficient funds")
    )) {
      return NextResponse.json({ message }, { status: 400 });
    }
    return authErrorResponse(error, "Failed to record bank transfer");
  }
}

export async function PATCH(req: Request) {
  try {
    await connectDB();
    const body = await req.json();

    const { transferId, action, reason } = body;
    if (!transferId || !action) {
      return NextResponse.json({ message: "transferId and action are required" }, { status: 400 });
    }

    const transfer = await TransferModel.findById(transferId).select("fromAccountId toAccountId").lean();
    if (!transfer) {
      return NextResponse.json({ message: "Transfer not found" }, { status: 404 });
    }

    const fromAccount = await AccountModel.findById(transfer.fromAccountId).select("_id companyId").lean();
    const auth = await authorizeResource({
      permission: "accounts.edit",
      companyId: fromAccount?.companyId ? String(fromAccount.companyId) : undefined,
    });
    if (!auth.authorized) {
      return NextResponse.json({ message: auth.reason || "Forbidden", code: auth.code }, { status: 403 });
    }

    const session = auth.session;

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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "";
    if (message && (
      message.includes("not found") ||
      message.includes("Maker-checker violation") ||
      message.includes("only PENDING_APPROVAL") ||
      message.includes("inactive") ||
      message.includes("Ledger sanity check") ||
      message.includes("Insufficient funds")
    )) {
      return NextResponse.json({ message }, { status: 400 });
    }
    return authErrorResponse(error, "Failed to update transfer status");
  }
}
