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
        "h-9 gap-2 rounded-full px-3.5 text-[0.8125rem] font-medium text-muted-foreground",
        "transition-[color,background-color,box-shadow,transform] duration-200 ease-out",
        "hover:bg-destructive/12 hover:text-destructive hover:shadow-sm",
        "active:scale-[0.98]",
        "focus-visible:ring-2 focus-visible:ring-destructive/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "dark:hover:bg-destructive/15",
        className
      )}
      onClick={() => signOut({ callbackUrl: "/login" })}
    >
      <LogOut className="size-3.5 opacity-80" aria-hidden />
      Sign out
    </Button>
  );
}
