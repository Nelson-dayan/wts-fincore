"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Route Error:", error);
  }, [error]);

  return (
    <div className="flex h-[80vh] w-full flex-col items-center justify-center p-6 text-center">
      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 max-w-lg w-full flex flex-col items-center shadow-xl">
        <div className="bg-red-500/10 p-4 rounded-full mb-6">
          <AlertCircle className="w-12 h-12 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight mb-2 text-foreground">Something went wrong!</h2>
        <p className="text-muted-foreground mb-6">
          {error.message || "We encountered an unexpected error while trying to load this page."}
        </p>
        
        {process.env.NODE_ENV === "development" && (
          <div className="w-full bg-black/90 p-4 rounded-lg mb-6 overflow-auto text-left max-h-40">
            <p className="text-red-400 font-mono text-xs whitespace-pre-wrap">
              {error.stack}
            </p>
          </div>
        )}

        <div className="flex items-center justify-center gap-4">
          <Button onClick={() => reset()} className="gap-2">
            <RefreshCcw className="w-4 h-4" /> Try again
          </Button>
          <Button variant="outline" onClick={() => window.location.href = "/admin"} className="gap-2">
            <Home className="w-4 h-4" /> Go Home
          </Button>
        </div>
      </div>
    </div>
  );
}
