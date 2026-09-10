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
          "size-9 shrink-0 rounded-xl border-border/70 bg-background/65 backdrop-blur-md",
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
        "size-9 shrink-0 rounded-xl border-border/60 bg-background/55 shadow-[0_1px_0_0_hsl(0_0%_100%/0.04)_inset,0_8px_24px_-12px_hsl(0_0%_0%/0.35)] backdrop-blur-md transition-[border-color,background-color,box-shadow,transform] duration-200 hover:-translate-y-px hover:border-primary/35 hover:bg-accent/45 hover:shadow-[0_1px_0_0_hsl(0_0%_100%/0.06)_inset,0_10px_28px_-10px_hsl(var(--primary)/0.2)] active:translate-y-0 motion-reduce:hover:translate-y-0 dark:bg-background/40 dark:shadow-[0_1px_0_0_hsl(0_0%_100%/0.05)_inset,0_12px_28px_-12px_hsl(0_0%_0%/0.5)]",
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
