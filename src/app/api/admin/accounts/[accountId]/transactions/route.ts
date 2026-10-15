import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { connectDB } from "@/lib/db/connect";
import { AccountModel, AccountTransactionModel } from "@/lib/db/models";
import { authErrorResponse } from "@/lib/api/route-auth";
import { parsePagination } from "@/lib/api/pagination";
import { authorizeResource } from "@/lib/auth/authorization";

interface RouteCtx {
  params: Promise<{ accountId: string }>;
}

export async function GET(req: Request, ctx: RouteCtx) {
  try {
    await connectDB();
    const { accountId } = await ctx.params;

    const account = await AccountModel.findById(accountId).select("_id companyId").lean();
    if (!account) {
      return NextResponse.json({ message: "Account not found" }, { status: 404 });
    }

    const auth = await authorizeResource({
      permission: "accounts.view",
      companyId: account.companyId ? String(account.companyId) : undefined,
    });

    if (!auth.authorized) {
      return NextResponse.json({ message: auth.reason || "Forbidden", code: auth.code }, { status: 403 });
    }

    const url = new URL(req.url);
    const { page, limit, skip } = parsePagination(url.searchParams);

    const [items, total] = await Promise.all([
      AccountTransactionModel.find({ accountId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("createdBy", "name")
        .populate("paymentId", "referenceNumber method")
        .lean(),
      AccountTransactionModel.countDocuments({ accountId }),
    ]);

    const sanitizedItems = JSON.parse(JSON.stringify(items), (key, value) => {
      if (value && typeof value === 'object' && value.$numberDecimal) {
        return parseFloat(value.$numberDecimal);
      }
      return value;
    });

    return NextResponse.json({ 
      items: sanitizedItems, 
      page, 
      limit, 
      total,
      hasMore: skip + items.length < total 
    });
  } catch (error) {
    return authErrorResponse(error, "Failed to load transactions");
  }
}
