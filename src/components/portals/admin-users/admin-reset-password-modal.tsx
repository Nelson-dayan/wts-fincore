"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, KeyRound, Loader2, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AdminUser } from "./types";

function generateSecurePassword() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  let pass = "";
  for (let i = 0; i < 12; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

export function AdminResetPasswordModal({
  user,
  onClose,
  onResetComplete,
}: {
  user: AdminUser | null;
  onClose: () => void;
  onResetComplete: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!user) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !loading) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [user, loading, onClose]);

  if (!user || !mounted) return null;

  const handleGenerate = () => {
    const generated = generateSecurePassword();
    setNewPassword(generated);
    setCopied(false);
  };

  const handleCopy = () => {
    if (!newPassword) return;
    navigator.clipboard.writeText(newPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.trim().length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${user._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to reset password");
      }
      setSuccess(true);
      setTimeout(() => {
        onResetComplete();
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6"
      role="presentation"
    >
      {/* Full screen backdrop */}
      <button
        type="button"
        aria-label="Close dialog"
        disabled={loading}
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px] transition-opacity dark:bg-black/60"
        onClick={() => !loading && onClose()}
      />

      {/* Centered Modal Card */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-border/80 bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/20">
              <KeyRound className="size-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Reset User Password</h3>
              <p className="text-xs text-muted-foreground">{user.name} ({user.email})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        {success ? (
          <div className="my-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
            <Check className="mx-auto size-8 text-emerald-500" />
            <p className="mt-2 text-sm font-bold text-emerald-700 dark:text-emerald-300">
              Password updated successfully!
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              User can now sign in with the new password.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="admin-new-password">New Password</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleGenerate}
                  className="h-7 px-2 text-[11px] font-semibold text-primary hover:bg-primary/10"
                >
                  <RefreshCw className="mr-1 size-3" /> Auto-generate
                </Button>
              </div>
              <div className="relative">
                <Input
                  id="admin-new-password"
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter or generate new password"
                  className="h-10 pr-20 font-mono text-sm"
                />
                {newPassword && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    className="absolute right-1 top-1 h-8 px-2 text-[11px] font-medium"
                  >
                    {copied ? (
                      <>
                        <Check className="mr-1 size-3 text-emerald-500" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="mr-1 size-3" /> Copy
                      </>
                    )}
                  </Button>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Minimum 6 characters. Make sure to securely share this password with the user.
              </p>
            </div>

            {error && (
              <p className="rounded-lg border border-destructive/25 bg-destructive/10 p-2.5 text-xs text-destructive">
                {error}
              </p>
            )}

            <div className="flex items-center justify-end gap-2 border-t border-border/60 pt-4">
              <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={loading || !newPassword}>
                {loading ? (
                  <>
                    <Loader2 className="mr-1.5 size-3.5 animate-spin" /> Saving…
                  </>
                ) : (
                  "Update Password"
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}
