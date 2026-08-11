import { NextResponse } from "next/server";

export type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  message?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    hasMore?: boolean;
    [key: string]: any;
  };
};

/**
 * Standard success response
 */
export function apiSuccess<T>(data: T, meta?: ApiResponse['meta'], status = 200) {
  return NextResponse.json({
    success: true,
    data,
    meta,
  }, { status });
}

/**
 * Standard error response
 */
export function apiError(message: string, status = 500, details?: any) {
  return NextResponse.json({
    success: false,
    message,
    details,
  }, { status });
}

export function isNextInternalError(error: unknown): boolean {
  if (typeof error === "object" && error !== null) {
    const digest = String((error as any).digest || "");
    const name = String((error as any).name || "");
    if (
      digest === "HANGING_PROMISE_REJECTION" ||
      digest === "DYNAMIC_SERVER_USAGE" ||
      digest.startsWith("NEXT_") ||
      name === "DynamicServerError"
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Wraps existing auth error logic into the standard format
 */
export function standardAuthError(error: unknown, fallbackMessage = "Unauthorized access") {
  if (isNextInternalError(error)) {
    throw error;
  }

  if (error instanceof Error) {
    if (error.message === "UNAUTHORIZED") {
      return apiError("Unauthorized", 401);
    }
    if (error.message.includes("is required")) {
      return apiError(error.message, 400);
    }
    if (error.message.includes("closed accounting period") || error.message.includes("locked")) {
      return apiError(error.message, 400);
    }
  }
  
  console.error(`[API ERROR]: ${fallbackMessage}`, error);
  return apiError(fallbackMessage, 500, process.env.NODE_ENV === 'development' ? String(error) : undefined);
}
