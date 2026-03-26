import { AuthShellFrame } from "@/components/auth/auth-shell-frame";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export function AuthPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.16),transparent)]"
        aria-hidden
      />
      <header className="relative z-10 flex justify-end px-4 pt-4 sm:px-6 sm:pt-5">
        <ThemeToggle />
      </header>
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 pb-10 pt-2 sm:px-6 sm:pb-14">
        <AuthShellFrame className="w-full max-w-md">{children}</AuthShellFrame>
      </div>
    </div>
  );
}
