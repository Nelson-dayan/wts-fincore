import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth/options";
import { connectDB } from "@/lib/db/connect";
import { UserModel } from "@/lib/db/models";
import { publicRegisterMessage } from "@/lib/register/http-map";
import { registerUser } from "@/lib/register/service";
import {
  REGISTER_LIMIT,
  REGISTER_WINDOW_MS,
  rateLimit,
} from "@/lib/rate-limit/memory";
import { getClientIpFromRequest } from "@/lib/security/client-ip";
import { getServerSession } from "next-auth";
import { isEmptyRegisterPayload } from "@/lib/register/validate";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (isEmptyRegisterPayload(body)) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const ip = getClientIpFromRequest(req);
  const rl = rateLimit(`register:${ip}`, REGISTER_LIMIT, REGISTER_WINDOW_MS);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)),
        },
      }
    );
  }

  const result = await registerUser(body, {
    headerRegisterSecret: req.headers.get("x-register-secret"),
  });

  if (result.ok) {
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json(
    { error: publicRegisterMessage(result.code, result.message) },
    { status: result.status }
  );
}

/** List users — admin only */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectDB();
  const users = await UserModel.find()
    .select("-password")
    .sort({ createdAt: -1 })
    .lean();
  return NextResponse.json(users);
}
