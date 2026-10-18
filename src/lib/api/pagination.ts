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

export class InvalidSearchParameterError extends Error {
  constructor(message = "Invalid search parameter") {
    super(message);
    this.name = "InvalidSearchParameterError";
  }
}

/**
 * Escapes special regular expression characters to prevent ReDoS and regex injection.
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function parseSearch(searchParams: URLSearchParams): string {
  // Reject parameter type confusion / bracket notation / encoded forms (e.g. q[$ne]=, q[0]=, q%5B=)
  for (const key of searchParams.keys()) {
    if (
      /^q(?:\[|\.|\$|%5[bB])/i.test(key) ||
      (key.startsWith("q") &&
        (key.includes("[") || key.includes("]") || key.includes("$") || key.includes(".")) &&
        key !== "quotationId")
    ) {
      throw new InvalidSearchParameterError("Invalid search parameter: bracket or object syntax not allowed");
    }
  }

  // Reject multiple / repeated q parameters
  const allQ = searchParams.getAll("q");
  if (allQ.length > 1) {
    throw new InvalidSearchParameterError("Invalid search parameter: multiple search parameters provided");
  }

  const rawQ = searchParams.get("q");
  if (rawQ === null || rawQ === undefined) {
    return "";
  }

  if (typeof rawQ !== "string") {
    throw new InvalidSearchParameterError("Invalid search parameter: must be a string");
  }

  // Maximum search length to prevent ReDoS / excessive memory usage
  if (rawQ.length > 200) {
    throw new InvalidSearchParameterError("Search parameter exceeds maximum allowed length of 200 characters");
  }

  // Reject malformed control characters / null bytes
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(rawQ)) {
    throw new InvalidSearchParameterError("Invalid search parameter: malformed control characters detected");
  }

  // Reject raw Mongo operators within the search string
  if (/\$(?:ne|eq|gt|gte|lt|lte|in|nin|regex|where|exists|expr|jsonSchema|mod|all|size|type)\b/i.test(rawQ)) {
    throw new InvalidSearchParameterError("Invalid search parameter: operator keywords not allowed");
  }

  return rawQ.trim();
}
