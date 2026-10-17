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

export function parseSearch(searchParams: URLSearchParams): string {
  // Reject parameter type confusion / bracket notation (e.g. q[$ne]=, q[0]=)
  for (const key of searchParams.keys()) {
    if (
      key.startsWith("q[") ||
      key.startsWith("q.") ||
      key.startsWith("q$") ||
      (key.startsWith("q") && (key.includes("[") || key.includes("$") || key.includes(".")))
    ) {
      throw new InvalidSearchParameterError("Invalid search parameter");
    }
  }

  // Reject multiple q parameters
  const allQ = searchParams.getAll("q");
  if (allQ.length > 1) {
    throw new InvalidSearchParameterError("Invalid search parameter");
  }

  const rawQ = searchParams.get("q");
  if (rawQ === null || rawQ === undefined) {
    return "";
  }

  if (typeof rawQ !== "string") {
    throw new InvalidSearchParameterError("Invalid search parameter");
  }

  // Reject raw Mongo operators within the search string
  if (/\$(?:ne|eq|gt|gte|lt|lte|in|nin|regex|where|exists|expr|jsonSchema|mod|all|size|type)\b/i.test(rawQ)) {
    throw new InvalidSearchParameterError("Invalid search parameter");
  }

  return rawQ.trim();
}
