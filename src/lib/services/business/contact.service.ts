import mongoose from "mongoose";
import { connectDB } from "@/lib/db/connect";
import { ContactModel, ProjectContactAssignmentModel } from "@/lib/db/models";
import { escapeRegex } from "@/lib/api/pagination";
import { sanitizeText } from "@/lib/security/sanitize";
import type { ContactData } from "@/types/contact";

export interface CreateContactInput {
  companyId: string;
  clientId?: string | null;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  alternatePhone?: string;
  jobTitle?: string;
  department?: string;
  notes?: string;
  status?: "ACTIVE" | "INACTIVE";
  createdBy: string;
}

export interface UpdateContactInput {
  clientId?: string | null;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  alternatePhone?: string;
  jobTitle?: string;
  department?: string;
  notes?: string;
  status?: "ACTIVE" | "INACTIVE";
}

export async function createContact(input: CreateContactInput): Promise<ContactData> {
  await connectDB();
  const created = await ContactModel.create({
    companyId: new mongoose.Types.ObjectId(input.companyId),
    clientId: input.clientId ? new mongoose.Types.ObjectId(input.clientId) : null,
    firstName: sanitizeText(input.firstName),
    lastName: sanitizeText(input.lastName),
    email: sanitizeText(input.email || "").toLowerCase(),
    phone: sanitizeText(input.phone || ""),
    alternatePhone: sanitizeText(input.alternatePhone || ""),
    jobTitle: sanitizeText(input.jobTitle || ""),
    department: sanitizeText(input.department || ""),
    notes: sanitizeText(input.notes || ""),
    status: input.status || "ACTIVE",
    createdBy: new mongoose.Types.ObjectId(input.createdBy),
  });

  return formatContact(created.toObject());
}

export async function updateContact(
  contactId: string,
  input: UpdateContactInput
): Promise<ContactData | null> {
  await connectDB();
  if (!mongoose.Types.ObjectId.isValid(contactId)) return null;

  const updateData: Record<string, unknown> = {};
  if (input.clientId !== undefined) {
    updateData.clientId = input.clientId ? new mongoose.Types.ObjectId(input.clientId) : null;
  }
  if (input.firstName !== undefined) updateData.firstName = sanitizeText(input.firstName);
  if (input.lastName !== undefined) updateData.lastName = sanitizeText(input.lastName);
  if (input.email !== undefined) updateData.email = sanitizeText(input.email).toLowerCase();
  if (input.phone !== undefined) updateData.phone = sanitizeText(input.phone);
  if (input.alternatePhone !== undefined) updateData.alternatePhone = sanitizeText(input.alternatePhone);
  if (input.jobTitle !== undefined) updateData.jobTitle = sanitizeText(input.jobTitle);
  if (input.department !== undefined) updateData.department = sanitizeText(input.department);
  if (input.notes !== undefined) updateData.notes = sanitizeText(input.notes);
  if (input.status !== undefined) updateData.status = input.status;

  const updated = await ContactModel.findOneAndUpdate(
    { _id: contactId, isDeleted: { $ne: true } },
    { $set: updateData },
    { returnDocument: "after" }
  ).lean();

  if (!updated) return null;
  return formatContact(updated);
}

export async function deleteContact(contactId: string): Promise<boolean> {
  await connectDB();
  if (!mongoose.Types.ObjectId.isValid(contactId)) return false;

  const result = await ContactModel.updateOne(
    { _id: contactId },
    { $set: { isDeleted: true, deletedAt: new Date() } }
  );

  if (result.modifiedCount > 0) {
    // Also remove project contact assignments for this contact
    await ProjectContactAssignmentModel.deleteMany({
      contactId: new mongoose.Types.ObjectId(contactId),
    });
    return true;
  }
  return false;
}

export async function getContactById(contactId: string): Promise<ContactData | null> {
  await connectDB();
  if (!mongoose.Types.ObjectId.isValid(contactId)) return null;

  const contact = await ContactModel.findOne({ _id: contactId, isDeleted: { $ne: true } }).lean();
  if (!contact) return null;
  return formatContact(contact);
}

export interface ListContactsFilter {
  companyId?: string;
  companyIds?: string[];
  clientId?: string;
  q?: string;
  status?: "ACTIVE" | "INACTIVE";
}

export async function listContacts(filter: ListContactsFilter = {}): Promise<ContactData[]> {
  await connectDB();
  const query: Record<string, unknown> = { isDeleted: { $ne: true } };

  if (filter.companyIds && filter.companyIds.length > 0) {
    query.companyId = { $in: filter.companyIds.filter(id => mongoose.Types.ObjectId.isValid(id)).map(id => new mongoose.Types.ObjectId(id)) };
  } else if (filter.companyId && mongoose.Types.ObjectId.isValid(filter.companyId)) {
    query.companyId = new mongoose.Types.ObjectId(filter.companyId);
  }

  if (filter.clientId) {
    if (filter.clientId === "null" || filter.clientId === "none") {
      query.clientId = null;
    } else if (mongoose.Types.ObjectId.isValid(filter.clientId)) {
      query.clientId = new mongoose.Types.ObjectId(filter.clientId);
    }
  }

  if (filter.status) {
    query.status = filter.status;
  }

  if (filter.q) {
    const escaped = escapeRegex(filter.q.trim());
    const regex = new RegExp(escaped, "i");
    query.$or = [
      { firstName: regex },
      { lastName: regex },
      { email: regex },
      { jobTitle: regex },
      { department: regex },
    ];
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
