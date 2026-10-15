import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { UserModel } from "@/lib/db/models";
import { requireRole } from "@/lib/auth/require-role";
import { authErrorResponse } from "@/lib/api/route-auth";
import { parsePagination, parseSearch, escapeRegex } from "@/lib/api/pagination";
import { registerUser } from "@/lib/register/service";
import { publicRegisterMessage } from "@/lib/register/http-map";
import { logActivity } from "@/lib/services/activity/log-activity.service";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const { page, limit, skip } = parsePagination(url.searchParams);
    const q = parseSearch(url.searchParams);
    await requireRole(["admin"]);
    await connectDB();
    const filter = q
      ? {
          $or: [
            { name: { $regex: escapeRegex(q), $options: "i" } },
            { email: { $regex: escapeRegex(q), $options: "i" } },
          ],
        }
      : {};
    const [usersRaw, total] = await Promise.all([
      UserModel.find(filter)
      .select("name email role isActive phone phoneNumber companyIds groupIds groupViewAccess primaryCompanyId signatureUrl createdAt updatedAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
      UserModel.countDocuments(filter),
    ]);
    const users = usersRaw.map((user) => ({
      ...user,
      role: user.role ?? "employee",
      companyIds: (user.companyIds || []).map(String),
      groupIds: (user.groupIds || []).map(String),
      groupViewAccess: Boolean(user.groupViewAccess),
      primaryCompanyId: user.primaryCompanyId ? String(user.primaryCompanyId) : "",
      phone:
        String(
          (user as { phone?: string }).phone ??
            (user as { phoneNumber?: string }).phoneNumber ??
            ""
        ) || "",
    }));
    return NextResponse.json({
      users,
      items: users,
      page,
      limit,
      total,
      hasMore: skip + users.length < total,
    });
  } catch (error) {
    return authErrorResponse(error, "Failed to load users");
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireRole(["admin"]);
    const body = (await req.json()) as {
      name?: string;
      email?: string;
      password?: string;
      phoneNumber?: string;
      role?: "admin" | "employee" | "super_admin";
      companyIds?: string[];
      groupIds?: string[];
      groupViewAccess?: boolean;
      primaryCompanyId?: string;
    };

    // Reuse registration validator+service to keep one source of truth.
    const result = await registerUser(body, {
      headerRegisterSecret: process.env.REGISTER_SECRET ?? null,
    });

    if (!result.ok) {
      return NextResponse.json(
        { message: publicRegisterMessage(result.code, result.message) },
        { status: result.status }
      );
    }

    await connectDB();

    const updateFields: Record<string, unknown> = {};
    if (body.role && ["admin", "employee", "super_admin"].includes(body.role)) {
      updateFields.role = body.role;
    }
    if (Array.isArray(body.companyIds)) {
      updateFields.companyIds = body.companyIds;
    }
    if (Array.isArray(body.groupIds)) {
      updateFields.groupIds = body.groupIds;
    }
    if (typeof body.groupViewAccess === "boolean") {
      updateFields.groupViewAccess = body.groupViewAccess;
    }
    if (body.primaryCompanyId) {
      updateFields.primaryCompanyId = body.primaryCompanyId;
    }

    let created = await UserModel.findOneAndUpdate(
      { email: String(body.email ?? "").toLowerCase() },
      { $set: updateFields },
      { returnDocument: "after" }
    )
      .select("_id name email role isActive phone companyIds groupIds groupViewAccess primaryCompanyId createdAt")
      .lean();

    if (created?._id) {
      await logActivity({
        userId: session.user.id,
        action: "created_user",
        entityType: "user",
        entityId: String(created._id),
        message: `Created user ${created.email} with role ${created.role}`,
      });
    }

    return NextResponse.json({ item: created }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error, "Failed to create user");
  }
}
