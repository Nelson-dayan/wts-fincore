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
 * Custom error class for invalid/malformed search parameters
 */
export class InvalidSearchParameterError extends Error {
  public readonly statusCode = 400;
  constructor(message = "Invalid search parameter") {
    super(message);
    this.name = "InvalidSearchParameterError";
  }
}

/**
 * Custom error class for malformed or suspicious query parameters (inherits InvalidSearchParameterError)
 */
export class InvalidQueryParamError extends InvalidSearchParameterError {
  constructor(message: string) {
    super(message);
    this.name = "InvalidQueryParamError";
  }
}

/**
 * Escapes special regular expression characters to prevent ReDoS and regex injection.
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
 * 3. Enforces string input up to `maxLength` (defaults to 100).
 * 4. Empty or whitespace-only search returns empty string `""` (no filter applied, normal list view).
 * 5. Rejects control characters and raw MongoDB operator injection keywords.
 * 6. Throws `InvalidQueryParamError` (HTTP 400, instanceof InvalidSearchParameterError) if malformed or injection attempt detected.
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
        "Invalid search parameter: bracket or object syntax not allowed"
      );
    }
  }

  // 2. Check searchParams keys for bracket notation or nested object parameter keys
  for (const key of searchParams.keys()) {
    if (
      /^q(?:\[|\.|\$|%5[bB])/i.test(key) ||
      (key.startsWith("q") &&
        (key.includes("[") || key.includes("]") || key.includes("$") || key.includes(".")) &&
        key !== "quotationId") ||
      key.toLowerCase().includes("[$") ||
      key.toLowerCase().includes("%5b%24")
    ) {
      throw new InvalidQueryParamError(
        "Invalid search parameter: bracket or object syntax not allowed"
      );
    }
  }

  // 3. Reject multiple / repeated q parameters
  const allQ = searchParams.getAll("q");
  if (allQ.length > 1) {
    throw new InvalidQueryParamError(
      "Invalid search parameter: multiple search parameters provided"
    );
  }

  // 4. Extract raw string value
  const rawQ = searchParams.get("q");
  if (rawQ === null || rawQ === undefined) {
    return "";
  }

  if (typeof rawQ !== "string") {
    throw new InvalidQueryParamError("Invalid search parameter: must be a string");
  }

  const trimmed = rawQ.trim();
  if (trimmed.length === 0) {
    return "";
  }

  // Maximum search length check
  if (trimmed.length > maxLength) {
    throw new InvalidQueryParamError(
      `Search query exceeds maximum allowable length of ${maxLength} characters.`
    );
  }

  // Reject malformed control characters / null bytes
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(rawQ)) {
    throw new InvalidQueryParamError(
      "Invalid search parameter: malformed control characters detected"
    );
  }

  // Reject raw Mongo operators within the search string
  if (/\$(?:ne|eq|gt|gte|lt|lte|in|nin|regex|where|exists|expr|jsonSchema|mod|all|size|type)\b/i.test(rawQ)) {
    throw new InvalidQueryParamError(
      "Invalid search parameter: operator keywords not allowed"
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid search parameter";
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
