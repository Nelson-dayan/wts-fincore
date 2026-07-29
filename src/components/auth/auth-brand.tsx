import Link from "next/link";
import { Shield } from "lucide-react";

export function AuthBrand() {
  return (
    <Link
      href="/login"
      className="group inline-flex items-center gap-2 rounded-lg px-1 py-0.5 text-foreground transition-opacity hover:opacity-90"
    >
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary/12 text-primary ring-1 ring-primary/15 transition-opacity group-hover:opacity-95">
        <Shield className="size-4" strokeWidth={1.75} aria-hidden />
      </span>
      <span className="flex flex-col items-start leading-none">
        <span className="text-[13px] font-semibold tracking-tight">
          WTS-FinCore
        </span>
        <span className="mt-0.5 text-[10px] font-medium text-muted-foreground">
          Secure workspace
        </span>
      </span>
    </Link>
  );
}
