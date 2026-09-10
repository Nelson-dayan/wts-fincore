"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export function SignOutButton({ className }: { className?: string }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn(
        "h-9 gap-1.5 rounded-xl px-2.5 sm:px-3 text-xs sm:text-sm font-medium text-muted-foreground transition-[transform,background-color,color] duration-200 hover:-translate-y-px hover:bg-destructive/12 hover:text-destructive active:translate-y-0 motion-reduce:hover:translate-y-0",
        className
      )}
      onClick={() => signOut({ callbackUrl: "/login" })}
      title="Sign out"
    >
      <LogOut className="size-4 shrink-0" aria-hidden />
      <span className="hidden sm:inline">Sign out</span>
    </Button>
  );
}
