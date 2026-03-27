import { CreateRecordForm } from "@/components/portals/create-record-form";
import { ResourceTableClient } from "@/components/portals/resource-table-client";

export default function AdminClientsPage() {
  return (
    <>
      <CreateRecordForm
        title="Create Client"
        endpoint="/api/admin/clients"
        fields={[
          { name: "name", label: "Name", required: true },
          { name: "company", label: "Company" },
          { name: "email", label: "Email", type: "email" },
          { name: "phone", label: "Phone" },
        ]}
      />
      <ResourceTableClient
        title="Clients"
        description="All client accounts in the system."
        endpoint="/api/admin/clients"
        columns={[
          { key: "name", label: "Name" },
          { key: "company", label: "Company" },
          { key: "email", label: "Email" },
          { key: "phone", label: "Phone" },
          { key: "createdAt", label: "Created At" },
        ]}
      />
    </>
  );
}
