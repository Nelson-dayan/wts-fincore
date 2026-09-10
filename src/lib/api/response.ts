import { ApiSuccess, ApiFailure } from "@/lib/types/api.types";

export function apiSuccess<T>(data: T, status = 200): Response {
  const payload: ApiSuccess<T> = {
    success: true,
    data,
    error: null,
  };
  return Response.json(payload, { status });
}

export function apiError(
  message: string,
  status = 500,
  details?: unknown
): Response {
  const payload: ApiFailure = {
    success: false,
    data: null,
    error: {
      message,
      details,
    },
  };
  return Response.json(payload, { status });
}
