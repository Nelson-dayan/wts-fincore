export const unstable_instant = { prefetch: 'static', unstable_disableValidation: true };

import { AdminUsersClient } from "@/components/portals/admin-users-client";

export default function AdminUsersPlaceholder() {
  return <AdminUsersClient />;
}
