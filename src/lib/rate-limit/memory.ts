/**
 * In-process rate limiter. Fits a single Node instance; swap for Redis in production.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

const MAX_KEYS = 50_000;

function prune(now: number) {
  if (buckets.size <= MAX_KEYS) return;
  for (const [k, b] of buckets) {
    if (now > b.resetAt) buckets.delete(k);
  }
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: true } | { ok: false; retryAfterMs: number } {
  const now = Date.now();
  prune(now);

  const cur = buckets.get(key);
  if (!cur || now > cur.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (cur.count >= limit) {
    return { ok: false, retryAfterMs: Math.max(0, cur.resetAt - now) };
  }
  cur.count += 1;
  return { ok: true };
}

/** Registration: 10 attempts / hour / IP */
export const REGISTER_LIMIT = 10;
export const REGISTER_WINDOW_MS = 60 * 60 * 1000;
