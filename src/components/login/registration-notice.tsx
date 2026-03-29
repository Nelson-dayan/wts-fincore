"use client";

import { useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

export function RegistrationNotice() {
  const searchParams = useSearchParams();
  if (searchParams?.get("registered") !== "1") return null;
  return (
    <div
      className="flex gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/8 px-3 py-2 text-[13px] text-foreground dark:border-emerald-400/20 dark:bg-emerald-500/10"
      role="status"
    >
      <CheckCircle2
        className="mt-0.5 size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400"
        aria-hidden
      />
      <p className="leading-snug">
        <span className="font-medium">Account created.</span> Sign in below.
      </p>
    </div>
  );
}
