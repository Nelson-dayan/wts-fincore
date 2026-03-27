/**
 * Main content area — subtle depth and soft top light (dashboard).
 */
export function PortalShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-0 flex-1">
      <div
        className="pointer-events-none absolute inset-0 bg-[var(--gradient-mesh)] opacity-90 dark:opacity-100"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,hsl(var(--muted)/0.28)_0%,transparent_36%)] dark:bg-[linear-gradient(180deg,hsl(var(--card)/0.35)_0%,transparent_40%)]"
        aria-hidden
      />
      <div
        className="auth-mesh pointer-events-none absolute inset-0 opacity-[0.28] dark:opacity-[0.14]"
        aria-hidden
      />
      <div className="relative">{children}</div>
    </div>
  );
}
