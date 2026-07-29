import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { ForgotPasswordForm } from "@/components/login/forgot-password-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Forgot Password",
  description: "Request a password reset for your WTS-FinCore account",
};

export default function ForgotPasswordPage() {
  return (
    <AuthPageShell>
      <Card className="glass-card border-white/25 dark:border-white/10 shadow-(--shadow-premium-lg)!">
        <CardHeader className="text-center sm:text-left">
          <CardTitle>Reset your password</CardTitle>
          <CardDescription>
            Enter your work email address below and we&apos;ll help you reset your password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={null}>
            <ForgotPasswordForm />
          </Suspense>
        </CardContent>
      </Card>
    </AuthPageShell>
  );
}
