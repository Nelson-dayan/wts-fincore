"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme/theme-provider";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <Button
        type="button"
        variant="outline"
        size="icon"
        className={cn(
          "size-9 shrink-0 rounded-lg border-border/80 bg-background/70 backdrop-blur-md",
          className
        )}
        disabled
        aria-hidden
      />
    );
  }

  const dark = resolvedTheme === "dark";
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className={cn(
        "size-9 shrink-0 rounded-lg border-border/80 bg-background/70 shadow-sm backdrop-blur-md transition-colors duration-200 hover:border-primary/25 hover:bg-accent/50",
        className
      )}
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
    >
      {dark ? (
        <Sun className="size-4.25 text-amber-400 transition-transform duration-200 group-hover:rotate-12" />
      ) : (
        <Moon className="size-4.25 text-primary transition-transform duration-200" />
      )}
    </Button>
  );
}
