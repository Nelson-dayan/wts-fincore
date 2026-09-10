import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { connectDB } from "@/lib/db/connect";
import { recordTransfer } from "@/lib/services/finance/transfer.service";
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

    const payload = {
      fromAccountId: body.fromAccountId,
      toAccountId: body.toAccountId,
      fromAmount: Number(body.fromAmount),
      toAmount: Number(body.toAmount),
      exchangeRate: Number(body.exchangeRate),
      fees: body.fees ? Number(body.fees) : 0,
      reference: body.reference || "",
      note: body.note || "",
      createdBy: session.user.id,
    };

    const result = await recordTransfer(payload);
    
    return NextResponse.json({ 
      success: true,
      item: {
        ...result,
        _id: result.transferId
      }
    }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error, "Failed to record bank transfer");
  }
}
