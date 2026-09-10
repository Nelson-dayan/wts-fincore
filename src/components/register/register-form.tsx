"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Loader2, Lock, Mail, Phone, User } from "lucide-react";
import {
  submitRegisterAction,
  type RegisterActionState,
} from "@/app/register/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils/cn";

const inputIcon =
  "pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/70";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      className="h-9 w-full text-[13px]"
      disabled={pending}
    >
      {pending ? (
        <>
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
          Creating…
        </>
      ) : (
        "Create account"
      )}
    </Button>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const [state, formAction] = useActionState<
    RegisterActionState | undefined,
    FormData
  >(submitRegisterAction, undefined);

  useEffect(() => {
    if (state?.ok) {
      router.replace("/login?registered=1");
    }
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="register-name">Name</Label>
        <div className="relative">
          <User className={inputIcon} aria-hidden />
          <Input
            id="register-name"
            name="name"
            autoComplete="name"
            required
            maxLength={100}
            placeholder="Full name"
            className="h-9 pl-9 text-[13px]"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="register-email">Email</Label>
        <div className="relative">
          <Mail className={inputIcon} aria-hidden />
          <Input
            id="register-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            placeholder="you@company.com"
            className="h-9 pl-9 text-[13px]"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="register-phone">Phone (optional)</Label>
        <div className="relative">
          <Phone className={inputIcon} aria-hidden />
          <Input
            id="register-phone"
            name="phoneNumber"
            type="tel"
            autoComplete="tel"
            maxLength={20}
            placeholder="+1 234 567 8900"
            className="h-9 pl-9 text-[13px]"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="register-password">Password</Label>
        <div className="relative">
          <Lock className={inputIcon} aria-hidden />
          <Input
            id="register-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={72}
            placeholder="8+ characters"
            className="h-9 pl-9 text-[13px]"
          />
        </div>
        <p className="text-[11px] leading-snug text-muted-foreground">
          At least 8 characters with letters and numbers.
        </p>
      </div>
      {state && !state.ok && state.message ? (
        <p
          className={cn(
            "rounded-lg border border-destructive/25 bg-destructive/8 px-3 py-2 text-[13px] text-destructive dark:bg-destructive/12"
          )}
          role="alert"
        >
          {state.message}
        </p>
      ) : null}
      <SubmitButton />
      <p className="text-center text-[10px] leading-snug text-muted-foreground">
        By registering you agree to our{" "}
        <span className="text-primary/90">terms (placeholder)</span>.
      </p>
    </form>
  );
}
