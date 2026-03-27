import { AuthBrand } from "@/components/auth/auth-brand";
import { AuthShellFrame } from "@/components/auth/auth-shell-frame";
import { ThemeToggle } from "@/components/theme/theme-toggle";

/**
 * Full-viewport auth layout — no page scroll. Theme toggle stays top-right (full-width header).
 * On very small heights, only the card area scrolls (scrollbar hidden globally).
 */
export function AuthPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden overscroll-none bg-background">
      <div
        className="pointer-events-none absolute inset-0 bg-[var(--gradient-auth)]"
        aria-hidden
      />
      <div
        className="auth-mesh pointer-events-none absolute inset-0 opacity-50 dark:opacity-35"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-[25%] top-[-18%] h-72 w-72 rounded-full bg-primary/18 blur-[80px] dark:bg-primary/12 sm:h-80 sm:w-80"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-[20%] bottom-[-22%] h-64 w-64 rounded-full bg-[hsl(220_90%_56%/0.12)] blur-[72px] dark:bg-[hsl(220_70%_50%/0.1)] sm:h-72 sm:w-72"
        aria-hidden
      />

      <header className="relative z-20 flex w-full shrink-0 items-center justify-between gap-3 px-4 py-3 sm:px-8 sm:py-4">
        <AuthBrand />
        <ThemeToggle className="shrink-0" />
      </header>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden px-4 pb-2 pt-1 sm:px-8">
        <AuthShellFrame className="flex min-h-0 w-full max-w-[400px] flex-col items-stretch">
          <div className="min-h-0 w-full max-h-[min(100%,calc(100dvh-7.25rem))] overflow-y-auto overscroll-y-contain py-1">
            {children}
          </div>
        </AuthShellFrame>
      </div>

      <footer className="relative z-20 shrink-0 px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 text-center sm:px-8">
        <p className="text-[10px] text-muted-foreground/75">
          Encrypted sessions · Role-based access
        </p>
      </footer>
    </div>
  );
}
