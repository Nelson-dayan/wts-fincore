"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";

export type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  const [mounted, setMounted] = useState(false);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !loading) onOpenChange(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, loading, onOpenChange]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close dialog"
        disabled={loading}
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px] transition-opacity dark:bg-black/60"
        onClick={() => !loading && onOpenChange(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-border/80 bg-card shadow-[0_24px_80px_-12px_rgba(0,0,0,0.35)] dark:shadow-[0_24px_80px_-12px_rgba(0,0,0,0.55)] animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="h-1 bg-linear-to-r from-primary/80 via-primary to-primary/40" />
        <div className="px-6 pb-6 pt-5 sm:px-7 sm:pt-6">
          <h2 id={titleId} className="text-lg font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          {description ? (
            <p id={descId} className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              disabled={loading}
              onClick={() => onOpenChange(false)}
            >
              {cancelLabel}
            </Button>
            <Button
              type="button"
              variant={variant === "destructive" ? "destructive" : "default"}
              className="rounded-xl"
              disabled={loading}
              onClick={() => void onConfirm()}
            >
              {loading ? "Please wait…" : confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
