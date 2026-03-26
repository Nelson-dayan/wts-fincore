import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth/password";
import { authOptions } from "@/lib/auth/options";
import { getServerSession } from "next-auth";
import { connectDB } from "@/lib/db/connect";
import { UserModel } from "@/lib/db/models";
import { DEFAULT_ROLE, USER_ROLES, type UserRole } from "@/lib/db/types/roles";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const phoneNumber = String(body.phoneNumber ?? "").trim();
    let role: UserRole = DEFAULT_ROLE;

    const requestedRole = body.role as string | undefined;
    const secret = req.headers.get("x-register-secret");
    const setupSecret = process.env.REGISTER_SECRET;

    if (requestedRole && USER_ROLES.includes(requestedRole as UserRole)) {
      if (setupSecret && secret === setupSecret) {
        role = requestedRole as UserRole;
      } else if (requestedRole !== "employee") {
        return NextResponse.json(
          { error: "Forbidden role without REGISTER_SECRET" },
          { status: 403 }
        );
      }
    }

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "name, email, and password are required" },
        { status: 400 }
      );
    }

    await connectDB();
    const exists = await UserModel.exists({ email });
    if (exists) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const hashed = await hashPassword(password);
    await UserModel.create({
      name,
      email,
      password: hashed,
      role,
      phoneNumber,
      isActive: true,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}

/** Optional: list users — scaffold only; protect in production */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectDB();
  const users = await UserModel.find()
    .select("-password")
    .sort({ createdAt: -1 })
    .lean();
  return NextResponse.json(users);
}
