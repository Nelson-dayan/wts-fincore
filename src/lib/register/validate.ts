import { USER_ROLES, type UserRole } from "@/lib/db/types/roles";

const NAME_MAX = 100;
const EMAIL_MAX = 254;
const PHONE_MAX = 20;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Normalize common “pretty” phone characters from placeholders */
export function normalizePhoneInput(value: string): string {
  return value
    .replace(/\u00B7/g, " ")
    .replace(/\u2022/g, " ")
    .replace(/\u2219/g, " ")
    .trim();
}

/** Practical email check (not full RFC 5322). */
function isEmailShape(s: string): boolean {
  if (s.length > EMAIL_MAX || /\s/.test(s)) return false;
  const at = s.indexOf("@");
  if (at <= 0 || at !== s.lastIndexOf("@")) return false;
  const local = s.slice(0, at);
  const domain = s.slice(at + 1);
  if (!local || !domain) return false;
  if (!domain.includes(".")) return false;
  if (domain.startsWith(".") || domain.endsWith(".")) return false;
  return true;
}

export type ParsedRegisterInput = {
  name: string;
  email: string;
  password: string;
  phoneNumber: string;
  role?: UserRole;
};

export type ParseRegisterResult =
  | { ok: true; data: ParsedRegisterInput }
  | { ok: false; message: string };

/**
 * Parse registration input from JSON or FormData-derived plain objects.
 */
export function parseRegisterPayload(raw: unknown): ParseRegisterResult {
  if (!isRecord(raw)) {
    return { ok: false, message: "Invalid request." };
  }

  const name =
    typeof raw.name === "string" ? raw.name.trim().slice(0, NAME_MAX) : "";
  if (!name) {
    return { ok: false, message: "Please enter your name." };
  }

  const emailRaw =
    typeof raw.email === "string"
      ? raw.email.trim().toLowerCase().slice(0, EMAIL_MAX)
      : "";
  if (!emailRaw) {
    return { ok: false, message: "Please enter your email." };
  }
  if (!isEmailShape(emailRaw)) {
    return {
      ok: false,
      message:
        "Please enter a valid email address (include a domain, e.g. name@company.com).",
    };
  }

  const password = typeof raw.password === "string" ? raw.password : "";
  if (password.length < 8 || password.length > 72) {
    return {
      ok: false,
      message: "Password must be between 8 and 72 characters.",
    };
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return {
      ok: false,
      message: "Password must include at least one letter and one number.",
    };
  }

  let phoneNumber = "";
  if (raw.phoneNumber != null && String(raw.phoneNumber).trim() !== "") {
    const rawPhone = normalizePhoneInput(String(raw.phoneNumber)).slice(
      0,
      PHONE_MAX
    );
    phoneNumber = rawPhone;
    if (!/^[\d+\-\s().]+$/u.test(phoneNumber)) {
      return {
        ok: false,
        message:
          "Phone can only include digits, spaces, and these symbols: + - ( ) .",
      };
    }
  }

  let role: UserRole | undefined;
  if (raw.role !== undefined && raw.role !== null && raw.role !== "") {
    const r = String(raw.role) as UserRole;
    if (!USER_ROLES.includes(r)) {
      return { ok: false, message: "Invalid role value." };
    }
    role = r;
  }

  return {
    ok: true,
    data: { name, email: emailRaw, password, phoneNumber, role },
  };
}

/** True when FormData / payload has no user intent (ignore noise + rate limits). */
export function isEmptyRegisterPayload(raw: unknown): boolean {
  if (!isRecord(raw)) return false;
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  const email = typeof raw.email === "string" ? raw.email.trim() : "";
  const password = typeof raw.password === "string" ? raw.password : "";
  const phone = normalizePhoneInput(
    raw.phoneNumber != null ? String(raw.phoneNumber) : ""
  );
  return !name && !email && !password && !phone;
}
