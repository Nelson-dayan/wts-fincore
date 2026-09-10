import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { ResetPasswordForm } from "@/components/login/reset-password-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Set New Password",
  description: "Enter your new password to complete your account recovery",
};

export default function ResetPasswordPage() {
  return (
    <AuthPageShell>
      <Card className="glass-card border-white/25 dark:border-white/10 shadow-(--shadow-premium-lg)!">
        <CardHeader className="text-center sm:text-left">
          <CardTitle>Set new password</CardTitle>
          <CardDescription>
            Choose a strong, unique password for your WTS-FinCore account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={null}>
            <ResetPasswordForm />
          </Suspense>
        </CardContent>
      </Card>
    </AuthPageShell>
  );
}
