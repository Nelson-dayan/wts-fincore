"use client";

import { useSearchParams } from "next/navigation";

export function RegistrationNotice() {
  const searchParams = useSearchParams();
  if (searchParams.get("registered") !== "1") return null;
  return (
    <p
      className="rounded-md border border-primary/25 bg-primary/10 px-3 py-2 text-sm text-foreground"
      role="status"
    >
      Account created. You can sign in now.
    </p>
  );
}
