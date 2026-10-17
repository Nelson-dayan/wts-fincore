/**
 * Server-side HTML Sanitization Utility (Pentest Finding #07 Remediation)
 * Strips HTML tags, script tags, event handlers, and malicious pseudo-protocols
 * before data is persisted to MongoDB.
 */

const DANGEROUS_BLOCK_TAGS_REGEX =
  /<\s*(script|style|iframe|object|embed|svg|math|applet|meta|link|base)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi;

const DANGEROUS_SELF_CLOSING_TAGS_REGEX =
  /<\s*(script|style|iframe|object|embed|svg|math|applet|meta|link|base)[^>]*\/?>/gi;

const ANY_TAG_REGEX = /<[^>]+>/g;

const EVENT_HANDLER_REGEX = /\bon\w+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi;

const JS_PROTOCOL_REGEX = /(?:javascript|vbscript|data\s*:\s*text\/html)\s*:[^\s"']*/gi;

/**
 * Sanitizes a free-text string by stripping all HTML tags, script payloads,
 * event handlers, and executable pseudo-protocols.
 */
export function sanitizeText(input: unknown): string {
  if (typeof input !== "string") {
    if (input == null) return "";
    return String(input);
  }

  let text = input.trim();
  if (!text) return "";

  // 1. Strip dangerous tags with their contents (scripts, svg, styles, iframes)
  text = text.replace(DANGEROUS_BLOCK_TAGS_REGEX, "");
  text = text.replace(DANGEROUS_SELF_CLOSING_TAGS_REGEX, "");

  // 2. Strip any remaining HTML tags
  text = text.replace(ANY_TAG_REGEX, "");

  // 3. Strip any residual inline event handlers (onerror, onclick, etc.)
  text = text.replace(EVENT_HANDLER_REGEX, "");

  // 4. Strip dangerous pseudo-protocols
  text = text.replace(JS_PROTOCOL_REGEX, "");

  return text.trim();
}

/**
 * Recursively sanitizes string fields within an object before database write.
 */
export function sanitizeObject<T>(input: T): T {
  if (input == null || typeof input !== "object") {
    if (typeof input === "string") {
      return sanitizeText(input) as unknown as T;
    }
    return input;
  }

  if (Array.isArray(input)) {
    return input.map((item) => sanitizeObject(item)) as unknown as T;
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    // Preserve binary data URLs if they are validated file URLs
    if (
      typeof value === "string" &&
      (key === "fileUrl" || key === "fileDataUrl") &&
      value.startsWith("data:")
    ) {
      result[key] = value;
    } else {
      result[key] = sanitizeObject(value);
    }
  }

  return result as T;
}
