export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export function parsePagination(searchParams: URLSearchParams): PaginationParams {
  const rawPage = Number(searchParams.get("page") ?? "1");
  const rawLimit = Number(searchParams.get("limit") ?? "10");
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
  const limit =
    Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(Math.floor(rawLimit), 50)
      : 10;
  return { page, limit, skip: (page - 1) * limit };
}

/**
 * Custom error class for malformed or suspicious query parameters
 */
export class InvalidQueryParamError extends Error {
  public readonly statusCode = 400;
  constructor(message: string) {
    super(message);
    this.name = "InvalidQueryParamError";
  }
}

/**
 * Escapes special regex characters in a search string to treat input as literal text.
 */
export function escapeRegex(text: string): string {
  return text.replace(/[-[\]{}()*+?.,\\^$|#]/g, "\\$&");
}

export const MAX_SEARCH_LENGTH = 100;

export interface ParseSearchOptions {
  maxLength?: number;
}

/**
 * Validates the raw and parsed search parameter `q`.
 *
 * Rules:
 * 1. Rejects any nested, object, or bracket notation parameters starting with `q[` or `q.` (e.g. `q[$ne]`, `q[$regex]`, `q.field`).
 * 2. Rejects repeated `q` parameters if multiple `q` parameters exist.
 * 3. Enforces single string input up to `MAX_SEARCH_LENGTH`.
 * 4. Empty or whitespace-only search returns empty string `""` (no filter applied, normal list view).
 * 5. Throws `InvalidQueryParamError` (HTTP 400) if malformed or injection attempt detected.
 */
export function parseSearch(
  input: URLSearchParams | URL | string,
  options?: ParseSearchOptions
): string {
  const maxLength = options?.maxLength ?? MAX_SEARCH_LENGTH;

  let searchParams: URLSearchParams;
  let rawSearch = "";

  if (typeof input === "string") {
    rawSearch = input;
    try {
      searchParams = new URL(input, "http://localhost").searchParams;
    } catch {
      searchParams = new URLSearchParams(input);
    }
  } else if (input instanceof URL) {
    rawSearch = input.search;
    searchParams = input.searchParams;
  } else {
    searchParams = input;
    try {
      rawSearch = searchParams.toString();
    } catch {
      rawSearch = "";
    }
  }

  // 1. Check raw query string for dangerous patterns before/after decoding
  if (rawSearch) {
    const rawLower = rawSearch.toLowerCase();
    if (
      /[?&]q\[/i.test(rawLower) ||
      /[?&]q\./i.test(rawLower) ||
      /[?&]q%5b/i.test(rawLower) ||
      /[?&]q%2e/i.test(rawLower) ||
      rawLower.startsWith("q[") ||
      rawLower.startsWith("q.") ||
      rawLower.startsWith("q%5b") ||
      rawLower.startsWith("q%2e")
    ) {
      throw new InvalidQueryParamError(
        `Invalid search parameter key. Object/operator bracket notation (e.g. q[$ne]) is forbidden.`
      );
    }
  }

  // 2. Check searchParams keys for bracket notation or nested object parameter keys
  for (const key of searchParams.keys()) {
    const lowerKey = key.toLowerCase();
    if (
      lowerKey.startsWith("q[") ||
      lowerKey.startsWith("q.") ||
      lowerKey.startsWith("q%5b") ||
      lowerKey.startsWith("q%2e") ||
      lowerKey.includes("[$") ||
      lowerKey.includes("%5b%24")
    ) {
      throw new InvalidQueryParamError(
        `Invalid search parameter key "${key}". Object/operator bracket notation is forbidden.`
      );
    }
  }

  // 3. Check for duplicate `q` parameters (e.g. ?q=foo&q=bar)
  const allQValues = searchParams.getAll("q");
  if (allQValues.length > 1) {
    throw new InvalidQueryParamError(
      "Multiple search 'q' parameters provided. Exactly one search query string is permitted."
    );
  }

  // 4. Extract and sanitize string value
  const rawQ = searchParams.get("q");
  if (rawQ === null || rawQ === undefined) {
    return "";
  }

  const trimmed = rawQ.trim();
  if (trimmed.length === 0) {
    return "";
  }

  if (trimmed.length > maxLength) {
    throw new InvalidQueryParamError(
      `Search query exceeds maximum allowable length of ${maxLength} characters.`
    );
  }

  return trimmed;
}

/**
 * Safe search parser that returns either the sanitized string or an HTTP 400 Response if invalid.
 */
export function getValidatedSearch(
  urlOrSearchParams: URL | URLSearchParams | string,
  options?: ParseSearchOptions
): { q: string; errorResponse?: null } | { q: null; errorResponse: Response } {
  let searchParams: URLSearchParams;
  if (typeof urlOrSearchParams === "string") {
    try {
      const parsedUrl = new URL(urlOrSearchParams, "http://localhost");
      searchParams = parsedUrl.searchParams;
    } catch {
      searchParams = new URLSearchParams(urlOrSearchParams);
    }
  } else if (urlOrSearchParams instanceof URL) {
    searchParams = urlOrSearchParams.searchParams;
  } else {
    searchParams = urlOrSearchParams;
  }

  try {
    const q = parseSearch(searchParams, options);
    return { q, errorResponse: null };
  } catch (err: any) {
    const message = err?.message || "Invalid search parameter";
    const res = new Response(
      JSON.stringify({
        success: false,
        error: "Invalid search parameter",
        message,
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
    return { q: null, errorResponse: res };
  }
}
