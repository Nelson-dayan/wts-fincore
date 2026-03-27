import { CreateRecordForm } from "@/components/portals/create-record-form";
import { ResourceTableClient } from "@/components/portals/resource-table-client";

export default function AdminProjectsPage() {
  return (
    <>
      <CreateRecordForm
        title="Create Project"
        endpoint="/api/admin/projects"
        fields={[
          { name: "name", label: "Name", required: true },
          { name: "clientId", label: "Client ID", required: true },
          { name: "description", label: "Description" },
          { name: "budget", label: "Budget", type: "number" },
        ]}
      />
      <ResourceTableClient
        title="Projects"
        description="Central project tracking across all clients."
        endpoint="/api/admin/projects"
        columns={[
          { key: "name", label: "Name" },
          { key: "status", label: "Status" },
          { key: "priority", label: "Priority" },
          { key: "budget", label: "Budget" },
          { key: "createdAt", label: "Created At" },
        ]}
      />
    </>
  );
}
