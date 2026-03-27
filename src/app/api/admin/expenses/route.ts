import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { connectDB } from "@/lib/db/connect";
import { ExpenseModel } from "@/lib/db/models";
import { authErrorResponse } from "@/lib/api/route-auth";
import { parsePagination, parseSearch } from "@/lib/api/pagination";
import { logActivity } from "@/lib/services/activity/log-activity.service";

export async function GET(req: Request) {
  try {
    await requireRole(["admin"]);
    await connectDB();
    const url = new URL(req.url);
    const { page, limit, skip } = parsePagination(url.searchParams);
    const q = parseSearch(url.searchParams);
    const filter = q
      ? {
          $or: [
            { title: { $regex: q, $options: "i" } },
            { category: { $regex: q, $options: "i" } },
          ],
        }
      : {};
    const [items, total] = await Promise.all([
      ExpenseModel.find(filter)
      .select("title amount category projectId createdAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
      ExpenseModel.countDocuments(filter),
    ]);
    return NextResponse.json({ items, page, limit, total, hasMore: skip + items.length < total });
  } catch (error) {
    return authErrorResponse(error, "Failed to load expenses");
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireRole(["admin"]);
    await connectDB();
    const body = (await req.json()) as {
      title?: string;
      amount?: number;
      category?: string;
      projectId?: string;
    };
    const title = String(body.title ?? "").trim();
    const category = String(body.category ?? "").trim();
    const amount = Number(body.amount ?? 0);
    if (!title || !category || amount <= 0) {
      return NextResponse.json(
        { message: "title, category and amount (>0) are required" },
        { status: 400 }
      );
    }

    const created = await ExpenseModel.create({
      title,
      amount,
      category,
      projectId: body.projectId ? String(body.projectId) : undefined,
      createdBy: session.user.id,
    });

    await logActivity({
      userId: session.user.id,
      action: "created_expense",
      entityType: "expense",
      entityId: String(created._id),
      message: `Created expense ${created.title}`,
      projectId: created.projectId ? String(created.projectId) : undefined,
    });

    return NextResponse.json({ item: created }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error, "Failed to create expense");
  }
}
