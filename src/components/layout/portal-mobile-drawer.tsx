"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export function PortalMobileDrawer({
  brand,
  actions,
  children,
}: {
  brand: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [open]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border/60 bg-card/70 backdrop-blur md:hidden">
        <div className="mx-auto flex w-full items-center justify-between gap-3 px-4 py-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 rounded-xl"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="size-4.5" aria-hidden />
          </Button>

          <div className="min-w-0 flex-1">{brand}</div>

          <div className="flex items-center gap-2">{actions}</div>
        </div>
      </header>

      <div
        className={cn(
          "fixed inset-0 z-40 bg-background/65 backdrop-blur-sm transition-opacity duration-200 md:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => setOpen(false)}
        aria-hidden
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 border-r border-border/60 bg-card/85 p-4 shadow-2xl backdrop-blur transition-transform duration-250 ease-out md:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
        aria-label="Mobile portal navigation"
      >
        <div className="mb-4 flex items-center justify-end">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 rounded-xl"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            <X className="size-4.5" aria-hidden />
          </Button>
        </div>

        <div
          className="flex h-[calc(100%-3.25rem)] flex-col gap-5 overflow-y-auto pr-1"
          onClick={(event) => {
            const target = event.target as HTMLElement;
            if (target.closest("a")) setOpen(false);
          }}
        >
          {children}
        </div>
      </aside>
    </>
  );
}
