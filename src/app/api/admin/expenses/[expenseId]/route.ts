import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { ExpenseModel } from "@/lib/db/models";
import { authErrorResponse } from "@/lib/api/route-auth";
import { logActivity } from "@/lib/services/activity/log-activity.service";
import { authorizeResource } from "@/lib/auth/authorization";

interface RouteCtx {
  params: Promise<{ expenseId: string }>;
}

export async function DELETE(
  _req: Request,
  ctx: RouteCtx
) {
  try {
    await connectDB();
    const { expenseId } = await ctx.params;

    if (!expenseId) {
      return NextResponse.json({ message: "expenseId is required" }, { status: 400 });
    }

    const existing = await ExpenseModel.findById(expenseId).lean();
    if (!existing || existing.isDeleted) {
      return NextResponse.json({ message: "Expense not found" }, { status: 404 });
    }

    const auth = await authorizeResource({
      permission: "expenses.delete",
      companyId: existing.companyId ? String(existing.companyId) : undefined,
      projectId: existing.projectId ? String(existing.projectId) : undefined,
    });

    if (!auth.authorized) {
      return NextResponse.json({ message: auth.reason || "Forbidden", code: auth.code }, { status: 403 });
    }

    const session = auth.session;

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
