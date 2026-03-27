import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";

export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

export async function requireRole(roles: Array<"admin" | "employee">) {
  const session = await requireSession();
  const role = session.user.role as "admin" | "employee";
  if (!roles.includes(role)) {
    throw new Error("FORBIDDEN");
  }
  return session;
}
