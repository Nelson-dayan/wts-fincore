import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { connectDB } from "@/lib/db/connect";
import { ExpenseModel } from "@/lib/db/models";
import { authErrorResponse } from "@/lib/api/route-auth";

export async function GET() {
  try {
    await requireRole(["admin"]);
    await connectDB();
    const items = await ExpenseModel.find()
      .select("title amount category projectId createdAt")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    return NextResponse.json({ items });
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

    return NextResponse.json({ item: created }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error, "Failed to create expense");
  }
}
