export const unstable_instant = { prefetch: 'static', unstable_disableValidation: true };

import { AdminOverviewClient } from "@/components/portals/admin-overview-client";

export default function AdminPortalHome() {
  return <AdminOverviewClient />;
}
