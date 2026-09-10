import type { RegisterErrorCode } from "@/lib/register/service";

const safeMessages: Record<RegisterErrorCode, string> = {
  INVALID_INPUT: "Check your details and try again.",
  FORBIDDEN_ROLE: "Registration not allowed.",
  EMAIL_TAKEN: "This email is already registered.",
  SERVER_ERROR: "Something went wrong. Try again later.",
};

export function publicRegisterMessage(
  code: RegisterErrorCode,
  detail?: string
): string {
  if (detail?.trim()) {
    return detail.trim();
  }
  return safeMessages[code];
}
