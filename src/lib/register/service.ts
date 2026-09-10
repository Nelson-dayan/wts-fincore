import { hashPassword } from "@/lib/auth/password";
import { connectDB } from "@/lib/db/connect";
import { UserModel } from "@/lib/db/models";
import { DEFAULT_ROLE, USER_ROLES, type UserRole } from "@/lib/db/types/roles";
import { parseRegisterPayload } from "@/lib/register/validate";

export type RegisterErrorCode =
  | "INVALID_INPUT"
  | "FORBIDDEN_ROLE"
  | "EMAIL_TAKEN"
  | "SERVER_ERROR";

export type RegisterOutcome =
  | { ok: true }
  | {
      ok: false;
      status: number;
      code: RegisterErrorCode;
      /** Optional detail (e.g. validation hint); safe to show to users */
      message?: string;
    };

export async function registerUser(
  raw: unknown,
  opts: { headerRegisterSecret?: string | null } = {}
): Promise<RegisterOutcome> {
  const parsed = parseRegisterPayload(raw);
  if (!parsed.ok) {
    return {
      ok: false,
      status: 400,
      code: "INVALID_INPUT",
      message: parsed.message,
    };
  }

  const { name, email, password, phoneNumber, role: requestedRole } = parsed.data;
  let role: UserRole = DEFAULT_ROLE;

  const setupSecret = process.env.REGISTER_SECRET;
  const secret = opts.headerRegisterSecret;

  if (requestedRole && USER_ROLES.includes(requestedRole)) {
    if (setupSecret && secret === setupSecret) {
      role = requestedRole;
    } else if (requestedRole !== "employee") {
      return { ok: false, status: 403, code: "FORBIDDEN_ROLE" };
    }
  }

  try {
    await connectDB();
    const exists = await UserModel.exists({ email });
    if (exists) {
      return { ok: false, status: 409, code: "EMAIL_TAKEN" };
    }

    const hashed = await hashPassword(password);
    await UserModel.create({
      name,
      email,
      password: hashed,
      role,
      phoneNumber: phoneNumber || "",
      isActive: true,
    });
    return { ok: true };
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error("[registerUser] database error:", err);
    }
    return {
      ok: false,
      status: 500,
      code: "SERVER_ERROR",
      message:
        process.env.NODE_ENV === "development" && err instanceof Error
          ? `Database error: ${err.message}`
          : undefined,
    };
  }
}
