import type { ClientForm } from "./types";

export const EMPTY_CLIENT_FORM: ClientForm = {
  name: "",
  company: "",
  email: "",
  phone: "",
  website: "",
  address: "",
  clientLogoText: "",
  clientSignatureText: "",
};

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function safeString(value: string | undefined | null): string {
  return value ?? "";
}
