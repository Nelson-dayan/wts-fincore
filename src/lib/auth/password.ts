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

export type PasswordValidationResult = {
  ok: boolean;
  valid: boolean;
  message?: string;
  error?: string;
};

/**
 * Validates password complexity per NIST / security pentest standards:
 * - Minimum 8 characters, maximum 72 characters (bcrypt limit)
 * - At least one lowercase letter
 * - At least one uppercase letter
 * - At least one digit
 * - At least one special character
 * - Disallow passwords that match or contain the user's email address or email username
 */
export function validatePasswordComplexity(
  password: string,
  email?: string
): PasswordValidationResult {
  function fail(msg: string): PasswordValidationResult {
    return { ok: false, valid: false, message: msg, error: msg };
  }

  if (!password || typeof password !== "string") {
    return fail("Password is required");
  }

  if (password.length < 8) {
    return fail("Password must be at least 8 characters long");
  }

  if (password.length > 72) {
    return fail("Password cannot exceed 72 characters");
  }

  if (email && typeof email === "string" && email.trim()) {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.toLowerCase();
    if (cleanPass === cleanEmail || cleanPass.includes(cleanEmail)) {
      return fail("Password cannot be identical to or contain your email address");
    }
    const usernamePart = cleanEmail.split("@")[0]?.trim();
    if (
      usernamePart &&
      usernamePart.length >= 3 &&
      (cleanPass === usernamePart || cleanPass.includes(usernamePart))
    ) {
      return fail("Password cannot be identical to or contain your username");
    }
  }

  if (!/[a-z]/.test(password)) {
    return fail("Password must contain at least one lowercase letter");
  }

  if (!/[A-Z]/.test(password)) {
    return fail("Password must contain at least one uppercase letter");
  }

  if (!/[0-9]/.test(password)) {
    return fail("Password must contain at least one digit");
  }

  if (!/[!@#$%^&*(),.?":{}|<>\-_=+\\~`\[\]]/.test(password)) {
    return fail("Password must contain at least one special character (!@#$%^&*...)");
  }

  return { ok: true, valid: true };
}
