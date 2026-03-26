"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setError("Please fill in all fields.");
      return;
    }

    router.push("/dashboard");
  }

  return (
    <section className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-lg border border-[color-mix(in_oklab,var(--foreground)12%,transparent)] bg-[color-mix(in_oklab,var(--foreground)4%,transparent)] p-6 shadow-sm"
      >
        <h1 className="text-center text-xl font-semibold tracking-tight">
          Log in
        </h1>

        <div className="space-y-1.5">
          <label htmlFor="login-email" className="block text-sm font-medium">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-[color-mix(in_oklab,var(--foreground)18%,transparent)] bg-[var(--background)] px-3 py-2 text-sm outline-none ring-offset-[var(--background)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--foreground)35%,transparent)]"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="login-password" className="block text-sm font-medium">
            Password
          </label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-[color-mix(in_oklab,var(--foreground)18%,transparent)] bg-[var(--background)] px-3 py-2 text-sm outline-none ring-offset-[var(--background)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--foreground)35%,transparent)]"
          />
        </div>

        {error ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          className="w-full rounded-md bg-[var(--foreground)] px-3 py-2.5 text-sm font-medium text-[var(--background)] transition-opacity hover:opacity-90"
        >
          Login
        </button>
      </form>
    </section>
  );
}
