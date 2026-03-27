"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const shell = cn(
    "group size-9 shrink-0 rounded-full border transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out",
    "border-border/55 bg-background/55 shadow-sm backdrop-blur-md",
    "hover:border-primary/30 hover:bg-muted/70 hover:shadow-md",
    "active:scale-[0.96]",
    "dark:border-white/[0.1] dark:bg-white/[0.06] dark:shadow-[inset_0_1px_0_hsl(0_0%_100%/0.06)] dark:hover:border-white/[0.16] dark:hover:bg-white/[0.1]",
    className
  );

  if (!mounted) {
    return (
      <Button
        type="button"
        variant="outline"
        size="icon"
        className={shell}
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
      className={shell}
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
    >
      {dark ? (
        <Sun className="size-[17px] text-amber-400 transition-transform duration-200 group-hover:rotate-12" />
      ) : (
        <Moon className="size-[17px] text-primary transition-transform duration-200" />
      )}
    </Button>
  );
}
