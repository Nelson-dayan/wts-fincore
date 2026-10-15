import { Suspense } from "react";
import { connection } from "next/server";
import { UserProfileClient } from "@/components/profile/user-profile-client";

async function AdminProfileContent() {
  await connection();
  return <UserProfileClient portal="admin" />;
}

export default function AdminProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
          Loading profile...
        </div>
      }
    >
      <AdminProfileContent />
    </Suspense>
  );
}
