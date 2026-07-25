"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, KeyRound, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [resetUrl, setResetUrl] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setResetUrl(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError("Please enter your registered email address.");
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to process request");
      }

      setSuccessMsg(data.message || "A password reset link has been created.");
      if (data.resetUrl) {
        setResetUrl(data.resetUrl);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred while requesting password reset.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      {successMsg ? (
        <div className="space-y-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs">
          <div className="flex items-start gap-2.5 text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
            <div>
              <p className="font-semibold text-sm">Reset Link Generated</p>
              <p className="mt-1 leading-relaxed">{successMsg}</p>
            </div>
          </div>

          {resetUrl && (
            <div className="mt-2 rounded-lg border border-border/80 bg-background/80 p-3 space-y-2">
              <p className="font-bold text-xs text-foreground flex items-center gap-1.5">
                <KeyRound className="size-3.5 text-primary" /> Direct Reset Link (Demo / Local):
              </p>
              <Link
                href={resetUrl}
                className="inline-block font-mono text-[11px] text-primary underline break-all hover:opacity-80"
              >
                Click here to reset your password now
              </Link>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-1.5">
            <Label htmlFor="forgot-email">Email Address</Label>
            <div className="relative">
              <Mail
                className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/70"
                aria-hidden
              />
              <Input
                id="forgot-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="h-9 pl-9 text-[13px]"
              />
            </div>
          </div>

          {error && (
            <p className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
              {error}
            </p>
          )}

          <Button type="submit" className="h-9 w-full text-[13px]" disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                Generating Reset Link…
              </>
            ) : (
              "Send Reset Link"
            )}
          </Button>
        </form>
      )}

      <div className="pt-2 border-t border-border/60">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Back to Sign in
        </Link>
      </div>
    </div>
  );
}
