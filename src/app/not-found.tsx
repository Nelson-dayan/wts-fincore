import Link from "next/link";
import { ArrowLeft, LayoutDashboard, Wallet, Compass, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "404 - Page Not Found",
  description: "The requested financial resource or page could not be found.",
};

export default function NotFound() {
  return (
    <main
      id="not-found-page"
      className="relative flex min-h-[90vh] w-full flex-col items-center justify-center overflow-hidden px-4 py-12"
    >
      {/* Ambient glowing background gradients */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-primary/20 to-blue-500/10 blur-[120px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute bottom-0 left-1/3 -z-10 h-[350px] w-[350px] rounded-full bg-gradient-to-br from-violet-500/10 to-indigo-500/15 blur-[100px]"
        aria-hidden="true"
      />

      {/* Main Glassmorphic Card */}
      <div className="relative w-full max-w-xl rounded-3xl border border-border/60 bg-card/70 p-8 shadow-2xl backdrop-blur-xl transition-all duration-300 sm:p-12 text-center">
        
        {/* Status Pill Badge */}
        <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-medium text-primary">
          <Compass className="h-3.5 w-3.5 animate-spin-slow" />
          <span>Error 404 · Navigation Out of Bounds</span>
        </div>

        {/* Big 404 Display */}
        <div className="relative select-none my-2">
          <span className="text-8xl sm:text-9xl font-black tracking-tighter bg-gradient-to-b from-foreground via-foreground/70 to-foreground/20 bg-clip-text text-transparent">
            404
          </span>
          <div
            className="absolute inset-0 flex items-center justify-center opacity-20 blur-2xl text-8xl sm:text-9xl font-black tracking-tighter text-primary"
            aria-hidden="true"
          >
            404
          </div>
        </div>

        {/* Heading & Subtitle */}
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-2">
          Resource Not Found
        </h1>
        <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
          The financial route, account record, or dashboard view you are trying to reach has moved, been archived, or does not exist.
        </p>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/admin" id="not-found-dashboard-btn" className="w-full sm:w-auto">
            <Button className="w-full gap-2 font-medium shadow-lg shadow-primary/20" size="lg">
              <LayoutDashboard className="h-4 w-4" />
              <span>Admin Dashboard</span>
            </Button>
          </Link>
          <Link href="/admin/accounts" id="not-found-accounts-btn" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full gap-2 font-medium" size="lg">
              <Wallet className="h-4 w-4" />
              <span>Treasury Accounts</span>
            </Button>
          </Link>
        </div>

        {/* System Health / Footer Note */}
        <div className="mt-10 pt-6 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>Core Ledger: Operational</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground/80">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            <span>WTS-FinCore Security Guard</span>
          </div>
        </div>
      </div>
    </main>
  );
}
