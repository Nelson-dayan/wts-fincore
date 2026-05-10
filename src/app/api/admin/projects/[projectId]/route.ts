import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { connectDB } from "@/lib/db/connect";
import {
  ExpenseModel,
  InvoiceModel,
  ProjectModel,
  PurchaseOrderModel,
  QuotationModel,
  UserModel,
} from "@/lib/db/models";
import { buildProjectDetailPayload } from "@/lib/services/business/project-detail-payload";
import { authErrorResponse } from "@/lib/api/route-auth";
import { logActivity } from "@/lib/services/activity/log-activity.service";

interface RouteCtx {
  params: Promise<{ projectId: string }>;
}

export async function GET(_req: Request, ctx: RouteCtx) {
  try {
    const session = await requireRole(["admin", "employee"]);
    await connectDB();
    const { projectId } = await ctx.params;

    if (session.user.role === "employee") {
      const assigned = await ProjectModel.exists({ _id: projectId, assignedTo: session.user.id });
      if (!assigned) {
        return NextResponse.json({ message: "Project not found" }, { status: 404 });
      }
    }

    const payload = await buildProjectDetailPayload(projectId);
    if (payload.notFound) {
      return NextResponse.json({ message: "Project not found" }, { status: 404 });
    }
    const { notFound: _n, ...body } = payload;
    return NextResponse.json(body);
  } catch (error) {
    return authErrorResponse(error, "Failed to load project details");
  }
}

export async function PATCH(req: Request, ctx: RouteCtx) {
  try {
    const session = await requireRole(["admin"]);
    await connectDB();
    const { projectId } = await ctx.params;
    const body = (await req.json()) as {
      name?: string;
      description?: string;
      status?: "lead" | "in_progress" | "completed" | "on_hold";
      priority?: "low" | "medium" | "high";
      budget?: number;
      assignedTo?: string[];
      currency?: string;
      category?: string;
      clientReference?: string;
      notes?: string;
      startDate?: string;
      targetEndDate?: string;
      actualEndDate?: string;
      fixCurrency?: boolean;
    };

    if (Array.isArray(body.assignedTo) && body.assignedTo.length > 0) {
      const userCount = await UserModel.countDocuments({ _id: { $in: body.assignedTo } });
      if (userCount !== body.assignedTo.length) {
        return NextResponse.json(
          { message: "One or more assigned users are invalid" },
          { status: 400 }
        );
      }
    }

    const $set: Record<string, unknown> = {
      name: body.name !== undefined ? String(body.name).trim() : undefined,
      description: body.description !== undefined ? String(body.description) : undefined,
      status: body.status,
      priority: body.priority,
      budget: body.budget,
      assignedTo: body.assignedTo,
      fixCurrency: body.fixCurrency,
    };
    
    if (body.currency !== undefined) $set.currency = String(body.currency).trim().toUpperCase();
    if (body.category !== undefined) $set.category = String(body.category).trim();
    if (body.clientReference !== undefined) $set.clientReference = String(body.clientReference).trim();
    if (body.notes !== undefined) $set.notes = String(body.notes).trim();
    if (body.startDate !== undefined) $set.startDate = body.startDate ? new Date(body.startDate) : null;
    if (body.targetEndDate !== undefined) $set.targetEndDate = body.targetEndDate ? new Date(body.targetEndDate) : null;
    if (body.actualEndDate !== undefined) $set.actualEndDate = body.actualEndDate ? new Date(body.actualEndDate) : null;

    // Remove undefined keys before update
    Object.keys($set).forEach(key => $set[key] === undefined && delete $set[key]);

    const updated = await ProjectModel.findByIdAndUpdate(
      projectId,
      { $set },
      { new: true }
    ).lean();

    if (!updated) {
      return NextResponse.json({ message: "Project not found" }, { status: 404 });
    }

    await logActivity({
      userId: session.user.id,
      action: "updated_project",
      entityType: "project",
      entityId: String(updated._id),
      message: `Updated project ${updated.name}`,
      projectId: String(updated._id),
    });

    return NextResponse.json({ item: updated });
  } catch (error) {
    return authErrorResponse(error, "Failed to update project");
  }
}

export async function DELETE(_req: Request, ctx: RouteCtx) {
  try {
    const session = await requireRole(["admin"]);
    await connectDB();
    const { projectId } = await ctx.params;

    const [quotationCount, poCount, invoiceCount, expenseCount] = await Promise.all([
      QuotationModel.countDocuments({ projectId }),
      PurchaseOrderModel.countDocuments({ projectId }),
      InvoiceModel.countDocuments({ projectId }),
      ExpenseModel.countDocuments({ projectId }),
    ]);

    if (quotationCount > 0 || poCount > 0 || invoiceCount > 0 || expenseCount > 0) {
      return NextResponse.json(
        {
          message:
            "Project cannot be deleted because it has linked quotations, purchase orders, invoices, or expenses.",
        },
        { status: 400 }
      );
    }

    const deleted = await ProjectModel.findByIdAndDelete(projectId).lean();
    if (!deleted) {
      return NextResponse.json({ message: "Project not found" }, { status: 404 });
    }

    await logActivity({
      userId: session.user.id,
      action: "deleted_project",
      entityType: "project",
      entityId: String(deleted._id),
      message: `Deleted project ${deleted.name}`,
      projectId: String(deleted._id),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error, "Failed to delete project");
  }
}
