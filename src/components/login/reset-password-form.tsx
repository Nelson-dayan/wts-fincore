"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Eye, EyeOff, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!token || !email) {
      setError("Invalid or missing reset token. Please request a new password reset link.");
      return;
    }

    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to reset password");
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "An error occurred while resetting your password.");
    } finally {
      setPending(false);
    }
  }

  if (success) {
    return (
      <div className="space-y-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
        <CheckCircle2 className="mx-auto size-8 text-emerald-500" />
        <div>
          <h3 className="font-bold text-base text-foreground">Password Reset Complete!</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Your password has been successfully updated. You can now sign in with your new credentials.
          </p>
        </div>
        <Button onClick={() => router.push("/login")} className="h-9 w-full text-xs">
          Sign In Now
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5">
      {!token || !email ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
          Invalid reset parameters. Please use the complete reset link sent to your email.
        </div>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="reset-email">Account Email</Label>
        <Input
          id="reset-email"
          type="email"
          value={email}
          disabled
          className="h-9 text-[13px] bg-muted/50 font-mono"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="new-password">New Password</Label>
        <div className="relative">
          <Lock
            className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/70"
            aria-hidden
          />
          <Input
            id="new-password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="h-9 pl-9 pr-9 text-[13px]"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirm-password">Confirm New Password</Label>
        <div className="relative">
          <Lock
            className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/70"
            aria-hidden
          />
          <Input
            id="confirm-password"
            type={showPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            className="h-9 pl-9 text-[13px]"
          />
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" className="h-9 w-full text-[13px]" disabled={pending || !token}>
        {pending ? (
          <>
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
            Updating Password…
          </>
        ) : (
          "Reset Password"
        )}
      </Button>

      <div className="pt-2 border-t border-border/60 text-center">
        <Link
          href="/login"
          className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel and return to sign in
        </Link>
      </div>
    </form>
  );
}
