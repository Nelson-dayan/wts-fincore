import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { connectDB } from "@/lib/db/connect";
import {
  ClientModel,
  ExpenseModel,
  InvoiceModel,
  ProjectModel,
  PurchaseOrderModel,
  QuotationModel,
  UserModel,
} from "@/lib/db/models";
import { decimalToNumber } from "@/lib/services/business/money";
import { authErrorResponse } from "@/lib/api/route-auth";
import { logActivity } from "@/lib/services/activity/log-activity.service";

interface RouteCtx {
  params: Promise<{ projectId: string }>;
}

export async function GET(_req: Request, ctx: RouteCtx) {
  try {
    await requireRole(["admin"]);
    await connectDB();
    const { projectId } = await ctx.params;

    const project = await ProjectModel.findById(projectId)
      .select("name description status priority budget clientId assignedTo createdAt updatedAt")
      .lean();
    if (!project) {
      return NextResponse.json({ message: "Project not found" }, { status: 404 });
    }

    const [client, quotations, purchaseOrders, invoices, expensesRaw] = await Promise.all([
      ClientModel.findById(project.clientId)
        .select("_id name company email address website clientLogoText clientSignatureText")
        .lean(),
      QuotationModel.find({ projectId })
        .select("_id quotationNumber status createdAt")
        .sort({ createdAt: -1 })
        .lean(),
      PurchaseOrderModel.find({ projectId })
        .select("_id poNumber type status createdAt")
        .sort({ createdAt: -1 })
        .lean(),
      InvoiceModel.find({ projectId, isDeleted: { $ne: true } })
        .select("_id invoiceNumber status dueDate totals totalsCache totalAmountBase createdAt")
        .sort({ createdAt: -1 })
        .lean(),
      ExpenseModel.find({ projectId, isDeleted: { $ne: true } })
        .select("_id title amount currency baseAmount category createdAt")
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    const expenseTotal = expensesRaw.reduce((sum, e) => sum + decimalToNumber(e.amount), 0);
    const expenseTotalBase = expensesRaw.reduce((sum, e) => sum + decimalToNumber(e.baseAmount || e.amount), 0);

    const expenses = expensesRaw.map((e) => ({
      _id: String(e._id),
      title: e.title,
      amount: decimalToNumber(e.amount),
      currency: e.currency || "AED",
      baseAmount: decimalToNumber(e.baseAmount || e.amount),
      category: e.category,
      createdAt: e.createdAt,
    }));

    // Profit Tracking using our pure Base Engine logic
    const totalReceivedBase = invoices.reduce((sum, inv) => {
      const cache = inv.totalsCache as any;
      return sum + (cache ? decimalToNumber(cache.totalReceivedBase) : 0);
    }, 0);
    
    const totalFeesBase = invoices.reduce((sum, inv) => {
      const cache = inv.totalsCache as any;
      return sum + (cache ? decimalToNumber(cache.totalFeesBase) : 0);
    }, 0);

    const profitBase = totalReceivedBase - expenseTotalBase;

    return NextResponse.json({
      project,
      client,
      quotations,
      purchaseOrders,
      invoices,
      expenses,
      expenseTotal,
      financials: {
        totalReceivedBase,
        totalFeesBase,
        totalExpensesBase: expenseTotalBase,
        profitBase
      }
    });
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

    const updated = await ProjectModel.findByIdAndUpdate(
      projectId,
      {
        $set: {
          name: body.name !== undefined ? String(body.name).trim() : undefined,
          description:
            body.description !== undefined ? String(body.description) : undefined,
          status: body.status,
          priority: body.priority,
          budget: body.budget,
          assignedTo: body.assignedTo,
        },
      },
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
