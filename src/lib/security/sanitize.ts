/**
 * Server-side HTML Sanitization Utility (Pentest Finding #07 Remediation)
 * Strips HTML tags, script tags, event handlers, and malicious pseudo-protocols
 * before data is persisted to MongoDB.
 */

const CONTROL_CHARS_REGEX = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

const DANGEROUS_BLOCK_TAGS_REGEX =
  /<\s*(script|style|iframe|object|embed|svg|math|applet|meta|link|base|form|noscript|template|frame|frameset)\b[^>]*>[\s\S]*?(?:<\s*\/\s*\1\s*>|$)/gi;

const DANGEROUS_SELF_CLOSING_TAGS_REGEX =
  /<\s*(script|style|iframe|object|embed|svg|math|applet|meta|link|base|form|noscript|template|frame|frameset)\b[^>]*\/?>/gi;

const HTML_COMMENT_REGEX = /<!--[\s\S]*?(-->|$)/g;

const HTML_DOCTYPE_OR_XML_REGEX = /<!(?:\[CDATA\[[\s\S]*?\]\]>|--[\s\S]*?--|DOCTYPE[^>]*>|[^>]*>)/gi;

// Matches HTML tags (opening, closing, self-closing) where tag name begins immediately with an ASCII letter
const HTML_TAG_REGEX = /<\/?([a-zA-Z][a-zA-Z0-9:-]*)(?:\s+[^>]*|\/[^>]*)?>/gi;

const EVENT_HANDLER_REGEX = /\bon\w+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi;

const JS_PROTOCOL_REGEX = /(?:javascript|vbscript|data\s*:\s*text\/html)\s*:[^\s"']*/gi;

/**
 * Sanitizes a free-text string by stripping all HTML tags, script payloads,
 * event handlers, and executable pseudo-protocols, while preserving
 * legitimate mathematical comparisons (e.g. 5 < 10 and 10 > 5).
 */
export function sanitizeText(input: unknown): string {
  if (typeof input !== "string") {
    if (input == null) return "";
    return String(input);
  }

  let text = input.trim();
  if (!text) return "";

  // Strip null bytes and non-printable control characters
  text = text.replace(CONTROL_CHARS_REGEX, "");

  let prev = "";
  let iterations = 0;
  const maxIterations = 10;

  while (text !== prev && iterations < maxIterations) {
    prev = text;
    iterations++;

    // 1. Strip dangerous tags with their contents (scripts, svg, styles, iframes)
    text = text.replace(DANGEROUS_BLOCK_TAGS_REGEX, "");
    text = text.replace(DANGEROUS_SELF_CLOSING_TAGS_REGEX, "");

    // 2. Strip comments and doctype / CDATA declarations
    text = text.replace(HTML_COMMENT_REGEX, "");
    text = text.replace(HTML_DOCTYPE_OR_XML_REGEX, "");

    // 3. Strip any remaining HTML tags
    text = text.replace(HTML_TAG_REGEX, "");

    // 4. Strip any residual inline event handlers (onerror, onclick, etc.)
    text = text.replace(EVENT_HANDLER_REGEX, "");

    // 5. Strip dangerous pseudo-protocols
    text = text.replace(JS_PROTOCOL_REGEX, "");
  }

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
