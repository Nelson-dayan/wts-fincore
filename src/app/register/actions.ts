"use server";

import { headers } from "next/headers";
import { publicRegisterMessage } from "@/lib/register/http-map";
import { registerUser } from "@/lib/register/service";
import {
  REGISTER_LIMIT,
  REGISTER_WINDOW_MS,
  rateLimit,
} from "@/lib/rate-limit/memory";
import { getClientIpFromHeaders } from "@/lib/security/client-ip";
import { isEmptyRegisterPayload } from "@/lib/register/validate";

export type RegisterActionState =
  | { ok: true }
  | { ok: false; message: string };

export async function submitRegisterAction(
  _prev: RegisterActionState | undefined,
  formData: FormData
): Promise<RegisterActionState> {
  const payload = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    phoneNumber: String(formData.get("phoneNumber") ?? ""),
  };

  // Ignore spurious empty submissions — no UI noise, no rate limit
  if (isEmptyRegisterPayload(payload)) {
    return { ok: false, message: "" };
  }

  const h = await headers();
  const ip = getClientIpFromHeaders(h);
  const rl = rateLimit(`register:${ip}`, REGISTER_LIMIT, REGISTER_WINDOW_MS);
  if (!rl.ok) {
    return {
      ok: false,
      message: "Too many registration attempts. Try again later.",
    };
  }

  const result = await registerUser(payload, { headerRegisterSecret: null });
  if (result.ok) return { ok: true };
  return {
    ok: false,
    message: publicRegisterMessage(result.code, result.message),
  };
}
