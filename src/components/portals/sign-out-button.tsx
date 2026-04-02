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
      className={cn(
        "h-9 gap-1.5 rounded-xl px-3 text-sm font-medium text-muted-foreground transition-[transform,background-color,color] duration-200 hover:-translate-y-px hover:bg-destructive/12 hover:text-destructive active:translate-y-0 motion-reduce:hover:translate-y-0",
        className
      )}
      onClick={() => signOut({ callbackUrl: "/login" })}
    >
      <LogOut className="size-3.5" aria-hidden />
      Sign out
    </Button>
  );
}
