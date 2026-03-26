"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-9 shrink-0 bg-background/80 backdrop-blur"
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
      className="size-9 shrink-0 bg-background/80 shadow-sm backdrop-blur"
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
    >
      {dark ? <Sun /> : <Moon />}
    </Button>
  );
}
