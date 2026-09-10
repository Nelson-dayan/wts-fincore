import mongoose from "mongoose";
import { connectDB } from "@/lib/db/connect";
import { ContactModel, ProjectContactAssignmentModel, ProjectModel } from "@/lib/db/models";
import { ProjectContactRole, type ProjectContactGrouped, type ContactData } from "@/types/contact";

export interface SetContactRolesInput {
  projectId: string;
  contactId: string;
  roles: ProjectContactRole[];
  createdBy: string;
}

export async function setContactRolesForProject(
  input: SetContactRolesInput
): Promise<ProjectContactGrouped | null> {
  await connectDB();
  if (
    !mongoose.Types.ObjectId.isValid(input.projectId) ||
    !mongoose.Types.ObjectId.isValid(input.contactId)
  ) {
    return null;
  }

  const projObjId = new mongoose.Types.ObjectId(input.projectId);
  const contactObjId = new mongoose.Types.ObjectId(input.contactId);
  const userObjId = new mongoose.Types.ObjectId(input.createdBy);

  const contact = await ContactModel.findOne({ _id: contactObjId, isDeleted: { $ne: true } }).lean();
  if (!contact) return null;

  // Deduplicate incoming roles
  const targetRoles = Array.from(new Set(input.roles));

  // Get existing assignments for this contact on this project
  const existingAssignments = await ProjectContactAssignmentModel.find({
    projectId: projObjId,
    contactId: contactObjId,
  }).lean();

  const existingRoles = existingAssignments.map((a) => a.role as ProjectContactRole);

  // Roles to remove
  const rolesToRemove = existingRoles.filter((r) => !targetRoles.includes(r));
  if (rolesToRemove.length > 0) {
    await ProjectContactAssignmentModel.deleteMany({
      projectId: projObjId,
      contactId: contactObjId,
      role: { $in: rolesToRemove },
    });
  }

  // Roles to add
  const rolesToAdd = targetRoles.filter((r) => !existingRoles.includes(r));
  if (rolesToAdd.length > 0) {
    const newDocs = rolesToAdd.map((role) => ({
      projectId: projObjId,
      contactId: contactObjId,
      role,
      createdBy: userObjId,
    }));
    await ProjectContactAssignmentModel.insertMany(newDocs, { ordered: false });
  }

  return {
    contact: formatContact(contact),
    roles: targetRoles,
  };
}

export async function removeContactFromProject(
  projectId: string,
  contactId: string
): Promise<boolean> {
  await connectDB();
  if (
    !mongoose.Types.ObjectId.isValid(projectId) ||
    !mongoose.Types.ObjectId.isValid(contactId)
  ) {
    return false;
  }

  const result = await ProjectContactAssignmentModel.deleteMany({
    projectId: new mongoose.Types.ObjectId(projectId),
    contactId: new mongoose.Types.ObjectId(contactId),
  });

  return result.deletedCount > 0;
}

export async function getProjectContacts(projectId: string): Promise<ProjectContactGrouped[]> {
  await connectDB();
  if (!mongoose.Types.ObjectId.isValid(projectId)) return [];

  const projObjId = new mongoose.Types.ObjectId(projectId);

  const assignments = await ProjectContactAssignmentModel.find({ projectId: projObjId }).lean();
  if (assignments.length === 0) return [];

  // Collect unique contact ObjectIds
  const contactIds = Array.from(new Set(assignments.map((a) => String(a.contactId))));
  const contacts = await ContactModel.find({
    _id: { $in: contactIds.map((id) => new mongoose.Types.ObjectId(id)) },
    isDeleted: { $ne: true },
  }).lean();

  const contactMap = new Map<string, any>();
  for (const c of contacts) {
    contactMap.set(String(c._id), c);
  }

  const groupedMap = new Map<string, ProjectContactRole[]>();
  for (const a of assignments) {
    const cId = String(a.contactId);
    if (!groupedMap.has(cId)) {
      groupedMap.set(cId, []);
    }
    groupedMap.get(cId)!.push(a.role as ProjectContactRole);
  }

  const result: ProjectContactGrouped[] = [];
  for (const [cId, roles] of groupedMap.entries()) {
    const contactDoc = contactMap.get(cId);
    if (contactDoc) {
      result.push({
        contact: formatContact(contactDoc),
        roles,
      });
    }
  }

  return result;
}

/**
 * Returns candidate contacts that can be assigned to a project:
 * - Client's contacts (if project has a clientId)
 * - Client-independent contacts (clientId is null)
 * - Any contact already assigned to the project
 */
export async function getCandidateContactsForProject(projectId: string): Promise<ContactData[]> {
  await connectDB();
  if (!mongoose.Types.ObjectId.isValid(projectId)) return [];

  const project = await ProjectModel.findById(projectId).lean();
  if (!project) return [];

  const query: Record<string, unknown> = { isDeleted: { $ne: true } };

  if (project.clientId) {
    query.$or = [
      { clientId: project.clientId },
      { clientId: null },
      { clientId: { $exists: false } },
    ];
  } else {
    query.clientId = null;
  }

  const list = await ContactModel.find(query).sort({ firstName: 1, lastName: 1 }).lean();
  return list.map(formatContact);
}

function formatContact(row: any): ContactData {
  return {
    _id: String(row._id),
    companyId: String(row.companyId),
    clientId: row.clientId ? String(row.clientId) : null,
    firstName: row.firstName || "",
    lastName: row.lastName || "",
    email: row.email || "",
    phone: row.phone || "",
    alternatePhone: row.alternatePhone || "",
    jobTitle: row.jobTitle || "",
    department: row.department || "",
    notes: row.notes || "",
    status: row.status || "ACTIVE",
    createdBy: String(row.createdBy),
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : undefined,
    updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : undefined,
    deletedAt: row.deletedAt ? new Date(row.deletedAt).toISOString() : null,
  };
}
