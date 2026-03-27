import { ResourceTableClient } from "@/components/portals/resource-table-client";

export default function AdminCompanyPage() {
  return (
    <ResourceTableClient
      title="Company Settings"
      description="Organization profile and default tax settings."
      endpoint="/api/admin/company"
      singleItem
      columns={[
        { key: "name", label: "Name" },
        { key: "email", label: "Email" },
        { key: "website", label: "Website" },
        { key: "logoUrl", label: "Logo URL" },
        { key: "updatedAt", label: "Updated At" },
      ]}
    />
  );
}
