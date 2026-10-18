import { UserModel } from "@/lib/db/models";

/**
 * Concurrency-Safe Persistent Account Lockout Service (Finding #06 Remediation)
 * Uses MongoDB document-level atomic operations to track failed login attempts
 * and lockout windows across serverless instances and multiple server nodes.
 */

export const LOGIN_MAX_FAILED_ATTEMPTS = 5;
export const LOGIN_LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export const LOCKOUT_CONFIG = {
  MAX_ATTEMPTS: LOGIN_MAX_FAILED_ATTEMPTS,
  LOCKOUT_DURATION_MINUTES: 15,
};

export interface LockoutStatus {
  locked: boolean;
  isLocked: boolean;
  remainingAttempts: number;
  retryAfterMs: number;
}

/**
 * Pure evaluation function for lockout state calculations and testing.
 */
export function calculateLockoutStatus(
  doc: { failedLoginAttempts?: number; lockoutUntil?: Date | string | null },
  nowMs: number = Date.now()
): LockoutStatus {
  const lockoutUntil = doc.lockoutUntil ? new Date(doc.lockoutUntil) : null;
  if (lockoutUntil && lockoutUntil.getTime() > nowMs) {
    return {
      locked: true,
      isLocked: true,
      remainingAttempts: 0,
      retryAfterMs: lockoutUntil.getTime() - nowMs,
    };
  }

  const attempts = doc.failedLoginAttempts ?? 0;
  if (attempts >= LOGIN_MAX_FAILED_ATTEMPTS && (!lockoutUntil || lockoutUntil.getTime() > nowMs)) {
    return {
      locked: true,
      isLocked: true,
      remainingAttempts: 0,
      retryAfterMs: LOGIN_LOCKOUT_WINDOW_MS,
    };
  }

  return {
    locked: false,
    isLocked: false,
    remainingAttempts: Math.max(0, LOGIN_MAX_FAILED_ATTEMPTS - attempts),
    retryAfterMs: 0,
  };
}

/**
 * Checks whether an account is currently locked out.
 * Expired lockouts are cleared automatically.
 */
export async function checkUserLockout(email: string): Promise<LockoutStatus> {
  const cleanEmail = String(email ?? "").trim().toLowerCase();
  if (!cleanEmail) {
    return { locked: false, isLocked: false, remainingAttempts: LOGIN_MAX_FAILED_ATTEMPTS, retryAfterMs: 0 };
  }

  const user = await UserModel.findOne({ email: cleanEmail })
    .select("+failedLoginAttempts +lockoutUntil")
    .lean();

  if (!user) {
    return { locked: false, isLocked: false, remainingAttempts: LOGIN_MAX_FAILED_ATTEMPTS, retryAfterMs: 0 };
  }

  const lockoutUntil = (user as any).lockoutUntil ? new Date((user as any).lockoutUntil) : null;
  const now = Date.now();

  if (lockoutUntil) {
    if (lockoutUntil.getTime() > now) {
      return {
        locked: true,
        isLocked: true,
        remainingAttempts: 0,
        retryAfterMs: lockoutUntil.getTime() - now,
      };
    }

    // Lockout has expired: reset counters
    await UserModel.updateOne(
      { _id: (user as any)._id },
      { $set: { failedLoginAttempts: 0, lockoutUntil: null } }
    );
  }

  return { locked: false, isLocked: false, remainingAttempts: LOGIN_MAX_FAILED_ATTEMPTS, retryAfterMs: 0 };
}

/**
 * Atomically records a failed login attempt for an account.
 * If consecutive failures reach the threshold, applies the lockout window.
 */
export async function recordFailedLoginPersistent(
  email: string
): Promise<{ locked: boolean; remaining: number }> {
  const cleanEmail = String(email ?? "").trim().toLowerCase();
  if (!cleanEmail) {
    return { locked: false, remaining: LOGIN_MAX_FAILED_ATTEMPTS };
  }

  const now = new Date();

  // 1. If user has an expired lockout, reset counters before incrementing
  await UserModel.updateOne(
    { email: cleanEmail, lockoutUntil: { $lte: now } },
    { $set: { failedLoginAttempts: 0, lockoutUntil: null } }
  );

  // 2. Concurrency-safe atomic increment
  const updated = await UserModel.findOneAndUpdate(
    {
      email: cleanEmail,
      $or: [
        { lockoutUntil: null },
        { lockoutUntil: { $lte: now } },
      ],
    },
    { $inc: { failedLoginAttempts: 1 } },
    { new: true }
  ).select("+failedLoginAttempts +lockoutUntil");

  if (!updated) {
    // User not found or already actively locked
    const existing = await UserModel.findOne({ email: cleanEmail })
      .select("+failedLoginAttempts +lockoutUntil")
      .lean();

    const lockoutUntil = (existing as any)?.lockoutUntil ? new Date((existing as any).lockoutUntil) : null;
    if (lockoutUntil && lockoutUntil.getTime() > Date.now()) {
      return { locked: true, remaining: 0 };
    }
    return { locked: false, remaining: LOGIN_MAX_FAILED_ATTEMPTS - 1 };
  }

  const attempts = updated.failedLoginAttempts ?? 0;
  if (attempts >= LOGIN_MAX_FAILED_ATTEMPTS) {
    const lockoutUntil = new Date(Date.now() + LOGIN_LOCKOUT_WINDOW_MS);
    await UserModel.updateOne(
      { _id: updated._id },
      { $set: { lockoutUntil } }
    );
    return { locked: true, remaining: 0 };
  }

  return {
    locked: false,
    remaining: Math.max(0, LOGIN_MAX_FAILED_ATTEMPTS - attempts),
  };
}

/**
 * Resets failed login counters and lockout state upon successful authentication.
 */
export async function clearFailedLoginPersistent(email: string): Promise<void> {
  const cleanEmail = String(email ?? "").trim().toLowerCase();
  if (!cleanEmail) return;

  await UserModel.updateOne(
    { email: cleanEmail },
    { $set: { failedLoginAttempts: 0, lockoutUntil: null } }
  );
}
