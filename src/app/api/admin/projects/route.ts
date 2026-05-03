import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { connectDB } from "@/lib/db/connect";
import { ClientModel, ProjectModel, UserModel } from "@/lib/db/models";
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
    const clientId = String(url.searchParams.get("clientId") ?? "").trim();
    const filter: Record<string, unknown> = {};
    if (q) filter.name = { $regex: q, $options: "i" };
    if (clientId) filter.clientId = clientId;
    const [itemsRaw, total] = await Promise.all([
      ProjectModel.find(filter)
      .select("name status priority budget currency category clientReference startDate targetEndDate actualEndDate createdAt clientId")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
      ProjectModel.countDocuments(filter),
    ]);
    const items = itemsRaw.map((item) => ({
      ...item,
      budget:
        typeof item.budget === "object" && item.budget !== null
          ? Number.parseFloat(String(item.budget))
          : item.budget,
    }));
    return NextResponse.json({ items, page, limit, total, hasMore: skip + items.length < total });
  } catch (error) {
    return authErrorResponse(error, "Failed to load projects");
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireRole(["admin"]);
    await connectDB();
    const body = (await req.json()) as {
      name?: string;
      description?: string;
      clientId?: string;
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
    };
    const name = String(body.name ?? "").trim();
    const clientId = String(body.clientId ?? "").trim();
    if (!name || !clientId) {
      return NextResponse.json(
        { message: "Project name and clientId are required" },
        { status: 400 }
      );
    }

    const clientExists = await ClientModel.exists({ _id: clientId });
    if (!clientExists) {
      return NextResponse.json({ message: "Client not found" }, { status: 404 });
    }
    if (Array.isArray(body.assignedTo) && body.assignedTo.length > 0) {
      const userCount = await UserModel.countDocuments({ _id: { $in: body.assignedTo } });
      if (userCount !== body.assignedTo.length) {
        return NextResponse.json(
          { message: "One or more assigned users are invalid" },
          { status: 400 }
        );
      }
    }

    const created = await ProjectModel.create({
      name,
      description: String(body.description ?? ""),
      clientId,
      assignedTo: Array.isArray(body.assignedTo)
        ? body.assignedTo
        : [session.user.id],
      status: body.status ?? "lead",
      priority: body.priority ?? "medium",
      budget: body.budget,
      currency: String(body.currency ?? "AED").trim().toUpperCase(),
      category: String(body.category ?? "").trim(),
      clientReference: String(body.clientReference ?? "").trim(),
      notes: String(body.notes ?? "").trim(),
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      targetEndDate: body.targetEndDate ? new Date(body.targetEndDate) : undefined,
      actualEndDate: body.actualEndDate ? new Date(body.actualEndDate) : undefined,
    });

    await logActivity({
      userId: session.user.id,
      action: "created_project",
      entityType: "project",
      entityId: String(created._id),
      message: `Created project ${created.name}`,
      projectId: String(created._id),
    });

    return NextResponse.json({ item: created }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error, "Failed to create project");
  }
}
