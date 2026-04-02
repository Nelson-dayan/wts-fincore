"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Loader2, Lock, Mail } from "lucide-react";
import { RegistrationNotice } from "@/components/login/registration-notice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils/cn";
import { readResponseJson } from "@/lib/http/read-response-json";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password;
    if (!trimmedEmail || !trimmedPassword) {
      setError("Please fill in all fields.");
      return;
    }

    setPending(true);
    const res = await signIn("credentials", {
      email: trimmedEmail,
      password: trimmedPassword,
      redirect: false,
    });
    setPending(false);

    if (res?.error) {
      setError("Invalid email or password.");
      return;
    }

    const sessionRes = await fetch("/api/auth/session");
    const session = await readResponseJson<{ user?: { role?: string } }>(sessionRes);
    const role = session?.user?.role as string | undefined;

    if (role === "admin") router.push("/admin");
    else router.push("/employee");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5">
      <Suspense fallback={null}>
        <RegistrationNotice />
      </Suspense>
      <div className="space-y-1.5">
        <Label htmlFor="login-email">Email</Label>
        <div className="relative">
          <Mail
            className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/70"
            aria-hidden
          />
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="h-9 pl-9 text-[13px]"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="login-password">Password</Label>
        <div className="relative">
          <Lock
            className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/70"
            aria-hidden
          />
          <Input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="h-9 pl-9 text-[13px]"
          />
        </div>
      </div>
      {error ? (
        <p
          className={cn(
            "rounded-lg border border-destructive/25 bg-destructive/8 px-3 py-2 text-[13px] text-destructive dark:bg-destructive/12"
          )}
          role="alert"
        >
          {error}
        </p>
      ) : null}
      <Button type="submit" className="h-9 w-full text-[13px]" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
            Signing in…
          </>
        ) : (
          "Sign in"
        )}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        First-time setup?{" "}
        <Link href="/setup" className="text-primary underline-offset-2 hover:underline">
          Initialize database
        </Link>
      </p>
    </form>
  );
}
