export default function AdminPortalHome() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Admin dashboard</h1>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">
        Structure only. Add user management, reports, and settings here.
      </p>
      <ul className="mt-8 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
        <li className="rounded-lg border border-dashed border-border p-4">
          Users &amp; roles
        </li>
        <li className="rounded-lg border border-dashed border-border p-4">
          System settings
        </li>
      </ul>
    </div>
  );
}
