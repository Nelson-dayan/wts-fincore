import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { connectDB } from "@/lib/db/connect";
import { ExpenseModel } from "@/lib/db/models";
import { authErrorResponse } from "@/lib/api/route-auth";
import { logActivity } from "@/lib/services/activity/log-activity.service";

interface RouteCtx {
  params: Promise<{ expenseId: string }>;
}

export async function DELETE(
  _req: Request,
  ctx: RouteCtx
) {
  try {
    const session = await requireRole(["admin"]);
    await connectDB();
    const { expenseId } = await ctx.params;

    if (!expenseId) {
      return NextResponse.json({ message: "expenseId is required" }, { status: 400 });
    }

    const existing = await ExpenseModel.findById(expenseId).lean();
    if (!existing || existing.isDeleted) {
      return NextResponse.json({ message: "Expense not found" }, { status: 404 });
    }

    // Soft delete
    await ExpenseModel.findByIdAndUpdate(expenseId, {
      $set: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    await logActivity({
      userId: session.user.id,
      action: "deleted_expense",
      entityType: "expense",
      entityId: expenseId,
      message: `Deleted expense ${existing.title}`,
      projectId: existing.projectId ? String(existing.projectId) : undefined,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error, "Failed to delete expense");
  }
}
