import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { connectDB } from "@/lib/db/connect";
import { executeTransition } from "@/lib/services/orchestration";
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

import { authorizeResource } from "@/lib/auth/authorization";

interface RouteCtx {
  params: Promise<{ projectId: string }>;
}

export async function GET(_req: Request, ctx: RouteCtx) {
  try {
    await connectDB();
    const { projectId } = await ctx.params;

    const projectDoc = await ProjectModel.findById(projectId).select("companyId").lean();
    if (!projectDoc) {
      return NextResponse.json({ message: "Project not found" }, { status: 404 });
    }

    const auth = await authorizeResource({
      permission: "projects.view",
      companyId: projectDoc.companyId ? String(projectDoc.companyId) : undefined,
      projectId,
    });
    if (!auth.authorized) {
      return authErrorResponse({ message: auth.reason, code: auth.code }, "Access denied");
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
    await connectDB();
    const { projectId } = await ctx.params;
    const body = (await req.json()) as {
      name?: string;
      description?: string;
      status?: "active" | "completed" | "on_hold";
      priority?: "low" | "medium" | "high";
      budget?: number;
      assignedTo?: string[];
      assignedMembers?: Array<{
        userId: string;
        rolePreset?: string;
        permissions?: any;
      }>;
      currency?: string;
      category?: string;
      clientReference?: string;
      notes?: string;
      startDate?: string;
      targetEndDate?: string;
      actualEndDate?: string;
      fixCurrency?: boolean;
    };

    const project = await ProjectModel.findById(projectId);
    if (!project) {
      return NextResponse.json({ message: "Project not found" }, { status: 404 });
    }

    const auth = await authorizeResource({
      permission: "projects.edit",
      companyId: project.companyId ? String(project.companyId) : undefined,
      projectId,
    });
    if (!auth.authorized) {
      return authErrorResponse({ message: auth.reason, code: auth.code }, "Access denied");
    }
    const session = auth.context;

    const previousStatus = project.status;

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
      priority: body.priority,
      budget: body.budget,
      assignedTo: body.assignedTo,
      assignedMembers: body.assignedMembers,
      fixCurrency: body.fixCurrency,
    };

    if (Array.isArray(body.assignedMembers)) {
      // Keep assignedTo in sync with member userIds
      const memberUserIds = body.assignedMembers.map(m => m.userId);
      $set.assignedTo = Array.from(new Set([...(body.assignedTo || []), ...memberUserIds]));
    }
    
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

    if (body.status !== undefined && body.status !== previousStatus) {
      let policyId = "";
      let triggerEvent = "PROJECT_PATCH_UPDATE";

      if (body.status === "completed") {
        policyId = "POL-PRJ-003";
        triggerEvent = "PROJECT_COMPLETED_VIA_PATCH";
      } else if (body.status === "on_hold") {
        policyId = "POL-PRJ-001";
        triggerEvent = "PROJECT_HOLD_VIA_PATCH";
      } else if (body.status === "active") {
        policyId = "POL-PRJ-002";
        triggerEvent = "PROJECT_RESUMED_VIA_PATCH";
      }

      if (policyId) {
        const result = await executeTransition({
          policyId,
          entityId: projectId,
          approvedBy: session.userId,
          triggerEvent,
          route: `/api/admin/projects/${projectId}`
        });

        if (!result.success) {
          return NextResponse.json(
            { message: result.message || "Project transition validation failed.", blockers: result.blockers },
            { status: 400 }
          );
        }
      } else {
        return NextResponse.json(
          { message: `Direct status transitions to '${body.status}' are prohibited. Policy not defined.` },
          { status: 400 }
        );
      }
    }

    await logActivity({
      userId: session.userId,
      action: "updated_project",
      entityType: "project",
      entityId: String(updated._id),
      message: `Updated project ${updated.name}`,
      projectId: String(updated._id),
    });

    const refreshed = await ProjectModel.findById(projectId).lean();
    return NextResponse.json({ item: refreshed });
  } catch (error) {
    return authErrorResponse(error, "Failed to update project");
  }
}

export async function DELETE(_req: Request, ctx: RouteCtx) {
  try {
    await connectDB();
    const { projectId } = await ctx.params;

    const project = await ProjectModel.findById(projectId).select("companyId name").lean();
    if (!project) {
      return NextResponse.json({ message: "Project not found" }, { status: 404 });
    }

    const auth = await authorizeResource({
      permission: "projects.delete",
      companyId: project.companyId ? String(project.companyId) : undefined,
      projectId,
    });
    if (!auth.authorized) {
      return authErrorResponse({ message: auth.reason, code: auth.code }, "Access denied");
    }
    const session = auth.context;

    const [quotationCount, poCount, invoiceCount, expenseCount] = await Promise.all([
      QuotationModel.countDocuments({ projectId }),
      PurchaseOrderModel.countDocuments({ projectId }),
      InvoiceModel.countDocuments({ projectId }),
      ExpenseModel.countDocuments({ projectId, isDeleted: { $ne: true } }),
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
      userId: session.userId,
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
