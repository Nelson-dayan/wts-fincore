import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { connectDB } from "@/lib/db/connect";
import { CompanyModel } from "@/lib/db/models";
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
    const filter = q ? { name: { $regex: q, $options: "i" } } : {};
    const [items, total] = await Promise.all([
      CompanyModel.find(filter)
        .select("name contactName email website address isPrimary updatedAt")
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      CompanyModel.countDocuments(filter),
    ]);
    return NextResponse.json({
      items,
      page,
      limit,
      total,
      hasMore: skip + items.length < total,
    });
  } catch (error) {
    return authErrorResponse(error, "Failed to load companies");
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireRole(["admin"]);
    await connectDB();
    const body = (await req.json()) as {
      name?: string;
      contactName?: string;
      email?: string;
      website?: string;
      address?: string;
      logoText?: string;
      signatureText?: string;
    };
    const name = String(body.name ?? "").trim();
    if (!name) {
      return NextResponse.json({ message: "Company name is required" }, { status: 400 });
    }

    const created = await CompanyModel.create({
      name,
      contactName: String(body.contactName ?? ""),
      email: String(body.email ?? "").toLowerCase(),
      website: String(body.website ?? ""),
      address: String(body.address ?? ""),
      logoText: String(body.logoText ?? ""),
      signatureText: String(body.signatureText ?? ""),
      isPrimary: false,
    });

    await logActivity({
      userId: session.user.id,
      action: "created_company",
      entityType: "company",
      entityId: String(created._id),
      message: `Created company ${created.name}`,
    });

    return NextResponse.json({ item: created }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error, "Failed to create company");
  }
}
