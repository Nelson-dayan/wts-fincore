import { Suspense } from "react";
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
import { ArrowRight } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";



export default async function Login() {
  const session = await getServerSession(authOptions);

  if (session) {
    const role = session.user?.role;
    if (role === "admin") {
      redirect("/admin");
    } else {
      redirect("/employee");
    }
  }

 return (
    <AuthPageShell>
      <Card className="glass-card border-white/25 dark:border-white/10 shadow-(--shadow-premium-lg)!">
        <CardHeader className="text-center sm:text-left">
          <CardTitle>Welcome back</CardTitle>
          <CardDescription>
            Sign in with your work email — secure workspace access.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
          {/* <div className="relative py-0.5">
            <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border/80" />
            <p className="relative mx-auto w-max bg-background/90 px-2.5 text-center text-[11px] text-muted-foreground backdrop-blur-sm dark:bg-background/75">
              New to WTS-FinCore?
            </p>
          </div>
          <Link
            href="/register"
            className="group flex w-full items-center justify-center gap-1.5 rounded-lg border border-border/80 bg-background/40 py-2.5 text-[13px] font-medium text-foreground shadow-sm backdrop-blur-sm transition-colors duration-200 hover:border-primary/25 hover:bg-primary/5 hover:text-primary"
          >
            Create an account
            <ArrowRight className="size-3.5 opacity-80 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link> */}
        </CardContent>
      </Card>
    </AuthPageShell>
  );
}
