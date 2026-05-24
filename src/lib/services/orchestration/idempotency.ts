import { createHash } from "crypto";
import { IdempotencyModel } from "@/lib/db/models";

export function generateEventFingerprint(params: {
  eventType: string;
  entityId: string;
  amount?: number;
  timestamp: number;
}): string {
  const payload = `${params.eventType}:${params.entityId}:${params.amount ?? 0}:${params.timestamp}`;
  return createHash("sha256").update(payload).digest("hex");
}

export async function checkOrRegisterEventFingerprint(params: {
  fingerprint: string;
  userId: string;
  route: string;
}): Promise<{ ok: boolean; message?: string }> {
  try {
    const existing = await IdempotencyModel.findOne({
      key: params.fingerprint,
      userId: params.userId
    });

    if (existing) {
      if (existing.status === "PROCESSING") {
        return { ok: false, message: "This event is currently being processed by another worker context." };
      }
      return { ok: false, message: "Duplicate transaction: This lifecycle event was already successfully processed." };
    }

    // Register active processing lease (TTL expires in 1 hour)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await IdempotencyModel.create({
      key: params.fingerprint,
      userId: params.userId,
      route: params.route,
      requestHash: params.fingerprint,
      status: "PROCESSING",
      expiresAt
    });

    return { ok: true };
  } catch (err: any) {
    console.error("Idempotency register failure:", err);
    return { ok: false, message: err.message || "Failed to establish idempotency lock." };
  }
}

export async function updateEventFingerprintStatus(
  fingerprint: string,
  userId: string,
  status: "SUCCESS" | "FAILED"
): Promise<void> {
  try {
    await IdempotencyModel.updateOne(
      { key: fingerprint, userId },
      { status }
    );
  } catch (err) {
    console.error("Failed to release idempotency lock:", err);
  }
}
