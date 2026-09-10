import type { Metadata } from "next";
import { Suspense } from "react";
import Login from "@/components/login/Login";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your WTS-FinCore account",
};

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <Login />
    </Suspense>
  );
}
