import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { connectDB } from "@/lib/db/connect";
import { ClientModel, ProjectModel } from "@/lib/db/models";
import { authErrorResponse } from "@/lib/api/route-auth";

export async function GET() {
  try {
    await requireRole(["admin"]);
    await connectDB();
    const items = await ProjectModel.find()
      .select("name status priority budget createdAt")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    return NextResponse.json({ items });
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
    });

    return NextResponse.json({ item: created }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error, "Failed to create project");
  }
}
