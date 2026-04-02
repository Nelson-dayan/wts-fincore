import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { connectDB } from "@/lib/db/connect";
import { ExpenseModel } from "@/lib/db/models";
import { authErrorResponse } from "@/lib/api/route-auth";
import { parsePagination, parseSearch } from "@/lib/api/pagination";
import { decimalToNumber } from "@/lib/services/business/money";

function formatExpenseRow(row: Record<string, unknown>) {
  const proj = row.projectId as unknown;
  let projectId = "";
  let projectName = "—";
  if (proj && typeof proj === "object" && proj !== null && "_id" in proj) {
    projectId = String((proj as { _id: unknown })._id);
    const n = (proj as { name?: string }).name;
    projectName = n ? String(n) : "—";
  } else if (proj) {
    projectId = String(proj);
  }
  const amount = row.amount;
  return {
    _id: row._id,
    title: row.title,
    amount: amount !== undefined && amount !== null ? decimalToNumber(amount) : amount,
    category: row.category,
    projectId,
    projectName,
    createdAt: row.createdAt,
  };
}

export async function GET(req: Request) {
  try {
    const session = await requireRole(["admin", "employee"]);
    await connectDB();
    const url = new URL(req.url);
    const { page, limit, skip } = parsePagination(url.searchParams);
    const q = parseSearch(url.searchParams);
    const filter = {
      createdBy: session.user.id,
      ...(q
        ? {
            $or: [
              { title: { $regex: q, $options: "i" } },
              { category: { $regex: q, $options: "i" } },
            ],
          }
        : {}),
    };
    const [itemsRaw, total] = await Promise.all([
      ExpenseModel.find(filter)
        .select("title amount category projectId createdAt")
        .populate("projectId", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ExpenseModel.countDocuments(filter),
    ]);
    const items = itemsRaw.map((row) => formatExpenseRow(row as Record<string, unknown>));
    return NextResponse.json({ items, page, limit, total, hasMore: skip + items.length < total });
  } catch (error) {
    return authErrorResponse(error, "Failed to load expenses");
  }
}
