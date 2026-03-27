import { CreateProjectForm } from "@/components/portals/create-project-form";
import { ResourceTableClient } from "@/components/portals/resource-table-client";

export default function AdminProjectsPage() {
  return (
    <>
      <CreateProjectForm />
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
