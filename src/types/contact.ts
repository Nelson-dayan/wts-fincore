export enum ProjectContactRole {
  PRIMARY = "PRIMARY",
  TECHNICAL = "TECHNICAL",
  BILLING = "BILLING",
  FINANCE = "FINANCE",
  PROJECT_MANAGER = "PROJECT_MANAGER",
  APPROVER = "APPROVER",
  PROCUREMENT = "PROCUREMENT",
  LEGAL = "LEGAL",
  OPERATIONS = "OPERATIONS",
  OTHER = "OTHER",
}

export const PROJECT_CONTACT_ROLE_LABELS: Record<ProjectContactRole, string> = {
  [ProjectContactRole.PRIMARY]: "Primary Contact",
  [ProjectContactRole.TECHNICAL]: "Technical Lead / Tech Contact",
  [ProjectContactRole.BILLING]: "Billing Contact",
  [ProjectContactRole.FINANCE]: "Finance / Accounts",
  [ProjectContactRole.PROJECT_MANAGER]: "Project Manager",
  [ProjectContactRole.APPROVER]: "Approver / Sign-off",
  [ProjectContactRole.PROCUREMENT]: "Procurement / Sourcing",
  [ProjectContactRole.LEGAL]: "Legal / Compliance",
  [ProjectContactRole.OPERATIONS]: "Operations",
  [ProjectContactRole.OTHER]: "Other",
};

export type ContactStatus = "ACTIVE" | "INACTIVE";

export interface ContactData {
  _id?: string;
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
  status: ContactStatus;
  createdBy: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface ProjectContactAssignmentData {
  _id?: string;
  projectId: string;
  contactId: string;
  role: ProjectContactRole;
  createdBy: string;
  createdAt?: string;
}

export interface ProjectContactGrouped {
  contact: ContactData;
  roles: ProjectContactRole[];
}
