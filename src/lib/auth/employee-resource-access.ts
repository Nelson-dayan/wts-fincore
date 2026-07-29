import mongoose from "mongoose";
import { InvoiceModel, ProjectModel, PurchaseOrderModel, QuotationModel } from "@/lib/db/models";

export type ProjectModule = "quotations" | "purchaseOrders" | "invoices" | "expenses" | "projectDetails";
export type ProjectAction = "view" | "create" | "edit" | "delete";

export async function getEmployeeAssignedProjectIdStrings(userId: string): Promise<string[]> {
  const ids = await ProjectModel.find({
    $or: [{ assignedTo: userId }, { "assignedMembers.userId": userId }]
  }).distinct("_id");
  return ids.map((id) => String(id));
}

export async function assertEmployeeCanAccessProject(
  userId: string, 
  projectId: string,
  module?: ProjectModule,
  action: ProjectAction = "view"
) {
  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    throw new Error("FORBIDDEN");
  }

  const project = await ProjectModel.findById(projectId).select("assignedTo assignedMembers").lean();
  if (!project) throw new Error("NOT_FOUND");

  const isAssignedLegacy = Array.isArray(project.assignedTo) && project.assignedTo.some((id: any) => String(id) === userId);
  const member = Array.isArray(project.assignedMembers) 
    ? project.assignedMembers.find((m: any) => String(m.userId) === userId)
    : null;

  if (!isAssignedLegacy && !member) {
    throw new Error("FORBIDDEN");
  }

  // If specific module check requested and member permissions exist, enforce action check
  if (module && member?.permissions) {
    const modPerms = (member.permissions as any)[module];
    if (modPerms && modPerms[action] === false) {
      throw new Error("FORBIDDEN");
    }
  }
}

export async function assertEmployeeCanAccessQuotation(
  userId: string, 
  quotationId: string,
  action: ProjectAction = "view"
) {
  const q = await QuotationModel.findById(quotationId).select("projectId createdBy").lean();
  if (!q) throw new Error("NOT_FOUND");
  const createdBy = q.createdBy ? String(q.createdBy) : "";
  if (createdBy === userId && action === "view") return;
  await assertEmployeeCanAccessProject(userId, String(q.projectId), "quotations", action);
}

export async function assertEmployeeCanAccessInvoice(
  userId: string, 
  invoiceId: string,
  action: ProjectAction = "view"
) {
  const inv = await InvoiceModel.findById(invoiceId).select("projectId").lean();
  if (!inv) throw new Error("NOT_FOUND");
  await assertEmployeeCanAccessProject(userId, String(inv.projectId), "invoices", action);
}

export async function assertEmployeeCanAccessPurchaseOrder(
  userId: string, 
  poId: string,
  action: ProjectAction = "view"
) {
  const po = await PurchaseOrderModel.findById(poId).select("projectId").lean();
  if (!po) throw new Error("NOT_FOUND");
  await assertEmployeeCanAccessProject(userId, String(po.projectId), "purchaseOrders", action);
}
