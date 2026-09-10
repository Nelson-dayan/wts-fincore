import { NextResponse } from "next/server";
import { standardAuthError } from "./standard-response";

export function authErrorResponse(error: unknown, fallbackMessage: string) {
  return standardAuthError(error, fallbackMessage);
}
