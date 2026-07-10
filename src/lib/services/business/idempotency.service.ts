import { createHash } from "node:crypto";
import mongoose from "mongoose";
import { IdempotencyModel } from "@/lib/db/models";

export interface IdempotencyCheckResult {
  status: "CACHED" | "IN_PROGRESS" | "NEW";
  responseBody?: any;
  responseStatus?: number;
}

/**
 * Computes a SHA-256 cryptographic hash of a given payload.
 */
export function computePayloadHash(payload: unknown): string {
  const content =
    typeof payload === "string" ? payload : JSON.stringify(payload ?? "");
  return createHash("sha256").update(content).digest("hex");
}

/**
 * Attempt to acquire an idempotency lock.
 * If the key has already been executed successfully, returns the cached response.
 * If another parallel thread is executing, returns IN_PROGRESS.
 * Throws an error if the key is reused with a different payload body.
 */
export async function checkOrCreateIdempotency(
  key: string,
  userId: string,
  route: string,
  payload: unknown
): Promise<IdempotencyCheckResult> {
  const hash = computePayloadHash(payload);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24-hour TTL

  try {
    // Attempt atomic insertion (lock reservation)
    await IdempotencyModel.create({
      key,
      userId: new mongoose.Types.ObjectId(userId),
      route,
      requestHash: hash,
      status: "PROCESSING",
      expiresAt,
    });
    return { status: "NEW" };
  } catch (error: any) {
    // MongoDB duplicate key error code is 11000
    if (error.code === 11000 || error.message?.includes("E11000")) {
      const existing = await IdempotencyModel.findOne({
        key,
        userId: new mongoose.Types.ObjectId(userId),
      }).lean();

      if (existing) {
        // Enforce Stripe payload matching constraint
        if (existing.requestHash !== hash) {
          throw new Error("IDEMPOTENCY_PAYLOAD_MISMATCH");
        }

        if (existing.status === "PROCESSING") {
          return { status: "IN_PROGRESS" };
        }

        return {
          status: "CACHED",
          responseBody: existing.responseBody,
          responseStatus: existing.responseStatus,
        };
      }
    }
    throw error;
  }
}

/**
 * Persists a successful response body and status code for future replays.
 */
export async function saveIdempotencySuccess(
  key: string,
  userId: string,
  responseBody: unknown,
  responseStatus: number = 200
): Promise<void> {
  await IdempotencyModel.updateOne(
    { key, userId: new mongoose.Types.ObjectId(userId) },
    {
      $set: {
        status: "SUCCESS",
        responseBody,
        responseStatus,
      },
    }
  );
}

/**
 * Removes the idempotency record in the event of an execution failure so clients can retry.
 */
export async function saveIdempotencyFailed(
  key: string,
  userId: string
): Promise<void> {
  await IdempotencyModel.deleteOne({
    key,
    userId: new mongoose.Types.ObjectId(userId),
  });
}
