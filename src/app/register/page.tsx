import type { Metadata } from "next";
import Link from "next/link";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RegisterForm } from "@/components/register/register-form";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Create account",
  description: "Register for WTS-FinCore",
};

export default function RegisterPage() {
  return (
    <AuthPageShell>
      <Card className="glass-card border-white/25 dark:border-white/10 !shadow-[var(--shadow-premium-lg)]">
        <CardHeader className="text-center sm:text-left">
          <CardTitle>Create an account</CardTitle>
          <CardDescription>
            Join with your email — you&apos;ll use it to sign in.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RegisterForm />
          <Link
            href="/login"
            className="group flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
            Back to sign in
          </Link>
        </CardContent>
      </Card>
    </AuthPageShell>
  );
}
