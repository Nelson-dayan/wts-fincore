"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  submitRegisterAction,
  type RegisterActionState,
} from "@/app/register/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="animate-spin" aria-hidden />
          Creating account…
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
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="register-name">Name</Label>
        <Input
          id="register-name"
          name="name"
          autoComplete="name"
          required
          maxLength={100}
          placeholder="Full name"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="register-email">Email</Label>
        <Input
          id="register-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          placeholder="you@company.com"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="register-phone">Phone (optional)</Label>
        <Input
          id="register-phone"
          name="phoneNumber"
          type="tel"
          autoComplete="tel"
          maxLength={20}
          placeholder="+1 234 567 8900"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="register-password">Password</Label>
        <Input
          id="register-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={72}
          placeholder="8+ chars, letters and numbers"
        />
        <p className="text-xs text-muted-foreground">
          Use at least 8 characters including letters and numbers.
        </p>
      </div>
      {state && !state.ok && state.message ? (
        <p className="text-sm text-destructive" role="alert">
          {state.message}
        </p>
      ) : null}
      <SubmitButton />
      <p className="text-xs text-muted-foreground">
        By registering you accept our{" "}
        <span className="text-primary">terms (placeholder)</span>
        .
      </p>
    </form>
  );
}
