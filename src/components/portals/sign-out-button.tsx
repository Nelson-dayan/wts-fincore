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
        "gap-1.5 rounded-lg text-muted-foreground transition-[color,background-color,box-shadow] duration-200 hover:bg-destructive/10 hover:text-destructive focus-visible:ring-destructive/30",
        className
      )}
      onClick={() => signOut({ callbackUrl: "/login" })}
    >
      <LogOut className="size-3.5" aria-hidden />
      Sign out
    </Button>
  );
}
