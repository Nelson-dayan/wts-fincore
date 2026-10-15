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
  valid: boolean;
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
  if (!password || typeof password !== "string") {
    return { valid: false, error: "Password is required." };
  }
  if (password.length < 8) {
    return {
      valid: false,
      error: "Password must be at least 8 characters long.",
    };
  }
  if (password.length > 72) {
    return {
      valid: false,
      error: "Password cannot exceed 72 characters.",
    };
  }

  if (email && typeof email === "string") {
    const normEmail = email.trim().toLowerCase();
    const normPass = password.toLowerCase();

    if (normEmail && normPass.includes(normEmail)) {
      return {
        valid: false,
        error: "Password cannot be identical to or contain your email address.",
      };
    }

    const localPart = normEmail.split("@")[0]?.trim();
    if (localPart && localPart.length >= 3 && normPass.includes(localPart)) {
      return {
        valid: false,
        error: "Password cannot contain your email username.",
      };
    }
  }

  if (!/[a-z]/.test(password)) {
    return {
      valid: false,
      error: "Password must include at least one lowercase letter.",
    };
  }
  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      error: "Password must include at least one uppercase letter.",
    };
  }
  if (!/[0-9]/.test(password)) {
    return {
      valid: false,
      error: "Password must include at least one number.",
    };
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return {
      valid: false,
      error:
        "Password must include at least one special character (e.g. !@#$%^&*).",
    };
  }

  return { valid: true };
}
