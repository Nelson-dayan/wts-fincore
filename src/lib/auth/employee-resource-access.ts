import mongoose from "mongoose";
import { InvoiceModel, ProjectModel, PurchaseOrderModel, QuotationModel } from "@/lib/db/models";

export async function getEmployeeAssignedProjectIdStrings(userId: string): Promise<string[]> {
  const ids = await ProjectModel.find({ assignedTo: userId }).distinct("_id");
  return ids.map((id) => String(id));
}

export async function assertEmployeeCanAccessProject(userId: string, projectId: string) {
  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    throw new Error("FORBIDDEN");
  }
  const ok = await ProjectModel.exists({ _id: projectId, assignedTo: userId });
  if (!ok) throw new Error("FORBIDDEN");
}

export async function assertEmployeeCanAccessQuotation(userId: string, quotationId: string) {
  const q = await QuotationModel.findById(quotationId).select("projectId createdBy").lean();
  if (!q) throw new Error("NOT_FOUND");
  const createdBy = q.createdBy ? String(q.createdBy) : "";
  if (createdBy === userId) return;
  await assertEmployeeCanAccessProject(userId, String(q.projectId));
}

export async function assertEmployeeCanAccessInvoice(userId: string, invoiceId: string) {
  const inv = await InvoiceModel.findById(invoiceId).select("projectId").lean();
  if (!inv) throw new Error("NOT_FOUND");
  await assertEmployeeCanAccessProject(userId, String(inv.projectId));
}

export async function assertEmployeeCanAccessPurchaseOrder(userId: string, poId: string) {
  const po = await PurchaseOrderModel.findById(poId).select("projectId").lean();
  if (!po) throw new Error("NOT_FOUND");
  await assertEmployeeCanAccessProject(userId, String(po.projectId));
}
