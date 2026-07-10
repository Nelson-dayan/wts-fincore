"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global Error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background text-foreground p-6">
          <div className="flex flex-col items-center text-center max-w-md">
            <AlertTriangle className="w-16 h-16 text-red-500 mb-6" />
            <h1 className="text-4xl font-extrabold tracking-tight mb-4">Critical System Error</h1>
            <p className="text-muted-foreground mb-8">
              A critical error occurred at the root application level. Please try refreshing the application.
            </p>
            <button
              onClick={() => reset()}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-bold hover:bg-primary/90 transition-colors"
            >
              <RefreshCcw className="w-5 h-5" /> Reload Application
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
