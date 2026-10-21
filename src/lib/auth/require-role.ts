import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { connection } from "next/server";

import { connectDB } from "@/lib/db/connect";
import { UserModel } from "@/lib/db/models";

let _testSessionOverride: any = null;
export function __setTestSession(session: any) {
  if (process.env.NODE_ENV === "production") return;
  _testSessionOverride = session;
}

export async function requireSession() {
  if (!_testSessionOverride) {
    await connection();
  }
  const session = _testSessionOverride ? { ..._testSessionOverride } : await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("UNAUTHORIZED");
  }

  // Authoritative database check to guarantee immediate session revocation on deactivation
  await connectDB();
  const user = await UserModel.findById(session.user.id).select("isActive role").lean();
  if (!user || user.isActive === false) {
    throw new Error("UNAUTHORIZED");
  }

  // Synchronize authoritative role
  if (user.role) {
    session.user.role = user.role;
  }

  return session;
}

export async function requireRole(roles: Array<"admin" | "employee" | "super_admin">) {
  const session = await requireSession();
  const role = session.user.role as "admin" | "employee" | "super_admin";
  if (role === "super_admin" || roles.includes(role)) {
    return session;
  }
  throw new Error("FORBIDDEN");
}

export async function requireSuperAdmin() {
  const session = await requireSession();
  if (session.user.role !== "super_admin") {
    throw new Error("FORBIDDEN");
  }
  return session;
}
