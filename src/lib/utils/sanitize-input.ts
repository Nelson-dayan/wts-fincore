/**
 * Server-side input sanitization utility to neutralize HTML injection,
 * stored XSS vectors, and active script payloads before database persistence.
 * Addresses PenTest Finding #07 (CWE-79: Improper Neutralization of Input).
 */

const SCRIPT_REGEX = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
const STYLE_REGEX = /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi;
const SVG_REGEX = /<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi;
const IFRAME_REGEX = /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi;
const OBJECT_REGEX = /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi;
const EMBED_REGEX = /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi;

// Match any HTML/XML open, close, or self-closing tags (e.g. <b>, </div>, <img src=x onerror=alert(1)>)
const HTML_TAG_REGEX = /<\/?[a-zA-Z][^>]*>/g;

// Dangerous pseudo-protocols and inline event handler fragments
const DANGEROUS_PROTOCOLS_REGEX = /(?:javascript|vbscript|data\s*:\s*text\/html)\s*:/gi;
const EVENT_HANDLER_REGEX = /\bon\w+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi;

/**
 * Strips all HTML tags, script blocks, and inline event handlers from a string.
 */
export function stripHtml(input: string): string {
  if (typeof input !== "string" || !input) {
    return "";
  }

  let cleaned = input
    .replace(SCRIPT_REGEX, "")
    .replace(STYLE_REGEX, "")
    .replace(SVG_REGEX, "")
    .replace(IFRAME_REGEX, "")
    .replace(OBJECT_REGEX, "")
    .replace(EMBED_REGEX, "")
    .replace(HTML_TAG_REGEX, "")
    .replace(DANGEROUS_PROTOCOLS_REGEX, "")
    .replace(EVENT_HANDLER_REGEX, "");

  // In case of nested/mangled brackets like <<img src=x onerror=...>>, repeat tag strip once
  if (cleaned.includes("<") && cleaned.includes(">")) {
    cleaned = cleaned.replace(HTML_TAG_REGEX, "");
  }

  return cleaned.trim();
}

/**
 * Sanitizes a single free-text input field.
 */
export function sanitizeText(input: unknown): string {
  if (input === null || input === undefined) return "";
  return stripHtml(String(input));
}

/**
 * Deeply sanitizes all string properties within an object or array.
 * Preserves numbers, booleans, dates, null, undefined, and non-plain objects.
 */
export function sanitizeObjectDeep<T>(value: T): T {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === "string") {
    return stripHtml(value) as unknown as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeObjectDeep(item)) as unknown as T;
  }

  if (typeof value === "object") {
    // Keep special instances intact
    if (value instanceof Date || Boolean(value && typeof value === "object" && "_bsontype" in (value as Record<string, unknown>))) {
      return value;
    }

    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = sanitizeObjectDeep(val);
    }
    return result as T;
  }

  return value;
}
