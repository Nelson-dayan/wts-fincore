import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { InitializeForm } from "@/components/setup/initialize-form";

export default function SetupPage() {
  return (
    <AuthPageShell>
      <div className="space-y-4 p-1">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">System Setup</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Initialize MongoDB collections and create your first admin account.
          </p>
        </div>
        <InitializeForm />
      </div>
    </AuthPageShell>
  );
}
