/** Best-effort client IP for rate limiting (trust boundary: set by your edge/proxy). */
export function getClientIpFromHeaders(h: Headers): string {
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return h.get("x-real-ip")?.trim() || "unknown";
}

export function getClientIpFromRequest(req: Request): string {
  return getClientIpFromHeaders(req.headers);
}
