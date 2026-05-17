import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { connectDB } from "@/lib/db/connect";
import { AccountTransactionModel } from "@/lib/db/models";
import { authErrorResponse } from "@/lib/api/route-auth";
import { parsePagination } from "@/lib/api/pagination";

interface RouteCtx {
  params: Promise<{ accountId: string }>;
}

export async function GET(req: Request, ctx: RouteCtx) {
  try {
    await requireRole(["admin"]);
    await connectDB();
    const { accountId } = await ctx.params;
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
