import { NextResponse } from "next/server";

export function authErrorResponse(error: unknown, fallbackMessage: string) {
  if (error instanceof Error && error.message === "UNAUTHORIZED") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  if (error instanceof Error && error.message === "FORBIDDEN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json({ message: fallbackMessage }, { status: 500 });
}
