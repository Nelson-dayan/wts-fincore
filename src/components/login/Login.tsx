import Link from "next/link";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { LoginForm } from "@/components/login/login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Login() {
  return (
    <AuthPageShell>
      <Card className="border-border/60 bg-card/85 shadow-lg backdrop-blur-sm">
        <CardHeader className="space-y-1 pb-4 text-center sm:text-left">
          <CardTitle className="text-2xl font-semibold tracking-tight">
            Welcome back
          </CardTitle>
          <CardDescription>
            Sign in with your work email to continue
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <LoginForm />
          <p className="text-center text-sm text-muted-foreground">
            New here?{" "}
            <Link
              href="/register"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Create an account
            </Link>
          </p>
        </CardContent>
      </Card>
    </AuthPageShell>
  );
}
