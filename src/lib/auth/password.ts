import bcrypt from "bcryptjs";

const ROUNDS = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export function verifyPassword(
  plain: string,
  hashed: string
): Promise<boolean> {
  return bcrypt.compare(plain, hashed);
}

export function validatePasswordComplexity(
  password: string,
  email?: string
): { ok: boolean; message?: string } {
  if (!password || typeof password !== "string") {
    return { ok: false, message: "Password is required" };
  }

  if (password.length < 8) {
    return { ok: false, message: "Password must be at least 8 characters long" };
  }

  if (!/[A-Z]/.test(password)) {
    return { ok: false, message: "Password must contain at least one uppercase letter" };
  }

  if (!/[a-z]/.test(password)) {
    return { ok: false, message: "Password must contain at least one lowercase letter" };
  }

  if (!/[0-9]/.test(password)) {
    return { ok: false, message: "Password must contain at least one digit" };
  }

  if (!/[!@#$%^&*(),.?":{}|<>\-_=+]/.test(password)) {
    return {
      ok: false,
      message: "Password must contain at least one special character (!@#$%^&*...)",
    };
  }

  if (email && typeof email === "string" && email.trim()) {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim().toLowerCase();
    if (cleanPass === cleanEmail) {
      return { ok: false, message: "Password cannot be identical to your email address" };
    }
    const usernamePart = cleanEmail.split("@")[0];
    if (usernamePart && usernamePart.length >= 3 && cleanPass === usernamePart) {
      return { ok: false, message: "Password cannot be identical to your username" };
    }
  }

  return { ok: true };
}
