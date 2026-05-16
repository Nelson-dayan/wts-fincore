"use client";

import { Search, Command } from "lucide-react";

export function CommandPaletteTrigger() {
  const handleClick = () => {
    // We dispatch a custom event that the CommandPalette listens for
    window.dispatchEvent(new KeyboardEvent("keydown", {
      key: "k",
      metaKey: true,
      bubbles: true
    }));
  };

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/60 bg-muted/30 hover:bg-muted/50 transition-colors text-muted-foreground w-64 group"
    >
      <Search className="w-4 h-4 group-hover:text-primary transition-colors" />
      <span className="text-xs flex-1 text-left font-medium">Search anything...</span>
      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-background border border-border/40 shadow-sm">
        <Command className="w-2.5 h-2.5" />
        <span className="text-[10px] font-bold">K</span>
      </div>
    </button>
  );
}
