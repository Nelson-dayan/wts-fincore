import { NextResponse } from "next/server";

export function authErrorResponse(error: unknown, fallbackMessage: string) {
  if (error instanceof Error && error.message === "UNAUTHORIZED") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  if (error instanceof Error && error.message === "FORBIDDEN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  
  const message = error instanceof Error ? error.message : fallbackMessage;
  console.error(`API ERROR [${fallbackMessage}]:`, error);
  
  return NextResponse.json(
    { message }, 
    { status: error instanceof Error && (error as any).name === 'ValidationError' ? 400 : 500 }
  );
}
