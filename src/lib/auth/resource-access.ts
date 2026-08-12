import { ProjectModel, ClientModel } from "@/lib/db/models";
import mongoose from "mongoose";

export interface ResourceAlignmentCheck {
  companyId: string;
  clientId?: string;
  projectId?: string;
}

export async function validateResourceHierarchyAlignment(check: ResourceAlignmentCheck): Promise<{
  valid: boolean;
  error?: string;
  project?: any;
  client?: any;
}> {
  if (check.projectId) {
    if (!mongoose.Types.ObjectId.isValid(check.projectId)) {
      return { valid: false, error: "INVALID_PROJECT_ID" };
    }
    const project = await ProjectModel.findById(check.projectId).select("companyId clientId").lean();
    if (!project) {
      return { valid: false, error: "PROJECT_NOT_FOUND" };
    }

    // Rule: Server-validated alignment between Project and Document
    if (String(project.companyId) !== String(check.companyId)) {
      return { valid: false, error: "PROJECT_COMPANY_MISMATCH: Project companyId does not match document companyId" };
    }

    if (check.clientId && String(project.clientId) !== String(check.clientId)) {
      return { valid: false, error: "PROJECT_CLIENT_MISMATCH: Project clientId does not match document clientId" };
    }

    return { valid: true, project };
  }

  if (check.clientId) {
    if (!mongoose.Types.ObjectId.isValid(check.clientId)) {
      return { valid: false, error: "INVALID_CLIENT_ID" };
    }
    const client = await ClientModel.findById(check.clientId).select("companyId").lean();
    if (!client) {
      return { valid: false, error: "CLIENT_NOT_FOUND" };
    }

    if (String(client.companyId) !== String(check.companyId)) {
      return { valid: false, error: "CLIENT_COMPANY_MISMATCH: Client companyId does not match document companyId" };
    }

    return { valid: true, client };
  }

  return { valid: true };
}
