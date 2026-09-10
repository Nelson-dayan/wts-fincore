import { ResourceTableClient } from "@/components/portals/resource-table-client";

export default function EmployeeProjectsPage() {
  return (
    <ResourceTableClient
      title="My Projects"
      description="Projects currently assigned to you."
      endpoint="/api/employee/projects"
      rowDetailPathPrefix="/employee/projects"
      columns={[
        { key: "name", label: "Name" },
        { key: "status", label: "Status" },
        { key: "priority", label: "Priority" },
        { key: "budget", label: "Budget" },
        { key: "updatedAt", label: "Updated At" },
      ]}
    />
  );
}
