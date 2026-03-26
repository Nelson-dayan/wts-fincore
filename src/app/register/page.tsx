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

export const metadata: Metadata = {
  title: "Create account",
  description: "Register for Sec DocuTrade",
};

export default function RegisterPage() {
  return (
    <AuthPageShell>
      <Card className="border-border/60 bg-card/85 shadow-lg backdrop-blur-sm">
        <CardHeader className="space-y-1 pb-4 text-center sm:text-left">
          <CardTitle className="text-2xl font-semibold tracking-tight">
            Create an account
          </CardTitle>
          <CardDescription>
            Employees can self-register. Admins are created with a server
            secret.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <RegisterForm />
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </AuthPageShell>
  );
}
