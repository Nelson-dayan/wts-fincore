import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { connectDB } from "@/lib/db/connect";
import { ClientModel } from "@/lib/db/models";
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
            { name: { $regex: q, $options: "i" } },
            { company: { $regex: q, $options: "i" } },
            { email: { $regex: q, $options: "i" } },
          ],
        }
      : {};
    const [items, total] = await Promise.all([
      ClientModel.find(filter)
      .select("name company email phone createdAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
      ClientModel.countDocuments(filter),
    ]);
    return NextResponse.json({ items, page, limit, total, hasMore: skip + items.length < total });
  } catch (error) {
    return authErrorResponse(error, "Failed to load clients");
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireRole(["admin"]);
    await connectDB();
    const body = (await req.json()) as {
      name?: string;
      company?: string;
      address?: string;
      email?: string;
      phone?: string;
    };
    const name = String(body.name ?? "").trim();
    if (!name) {
      return NextResponse.json({ message: "Client name is required" }, { status: 400 });
    }

    const created = await ClientModel.create({
      name,
      company: String(body.company ?? ""),
      address: String(body.address ?? ""),
      email: String(body.email ?? "").toLowerCase(),
      phone: String(body.phone ?? ""),
      clientLogoUrl: "",
      createdBy: session.user.id,
    });

    await logActivity({
      userId: session.user.id,
      action: "created_client",
      entityType: "client",
      entityId: String(created._id),
      message: `Created client ${created.name}`,
    });

    return NextResponse.json({ item: created }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error, "Failed to create client");
  }
}
