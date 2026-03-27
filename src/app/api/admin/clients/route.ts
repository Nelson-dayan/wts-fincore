import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { connectDB } from "@/lib/db/connect";
import { ClientModel } from "@/lib/db/models";
import { authErrorResponse } from "@/lib/api/route-auth";

export async function GET() {
  try {
    await requireRole(["admin"]);
    await connectDB();
    const items = await ClientModel.find()
      .select("name company email phone createdAt")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    return NextResponse.json({ items });
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

    return NextResponse.json({ item: created }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error, "Failed to create client");
  }
}
