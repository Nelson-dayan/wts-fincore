/**
 * Dashboard area background — subtle depth without competing with content.
 */
export function PortalShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-0 flex-1">
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,hsl(var(--muted)/0.35)_0%,transparent_28%)] dark:bg-[linear-gradient(180deg,hsl(var(--card)/0.5)_0%,transparent_32%)]"
        aria-hidden
      />
      <div
        className="auth-mesh pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-[0.2]"
        aria-hidden
      />
      <div className="relative">{children}</div>
    </div>
  );
}
