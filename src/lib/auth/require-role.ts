import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { connection } from "next/server";

export async function requireSession() {
  await connection();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("UNAUTHORIZED");
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
