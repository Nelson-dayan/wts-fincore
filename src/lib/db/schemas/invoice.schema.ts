import { Schema, Types } from "mongoose";
import {
  clientSnapshotSchema,
  companySnapshotSchema,
  decimalField,
  documentInfoSchema,
  schemaOptions,
  totalsSchema,
} from "@/lib/db/schemas/shared.schema";

const invoiceItemSchema = new Schema(
  {
    number: { type: Number, required: true, min: 1 },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    quantity: { type: Number, required: true, min: 0 },
    price: decimalField,
  },
  { _id: false }
);

const invoicePageSchema = new Schema(
  {
    pageNumber: { type: Number, required: true, min: 1 },
    items: { type: [invoiceItemSchema], default: [] },
  },
  { _id: false }
);

export const invoiceSchema = new Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true, index: true },
    projectId: { type: Types.ObjectId, ref: "Project", required: true, index: true },
    poId: { type: Types.ObjectId, ref: "PurchaseOrder", index: true },
    createdBy: { type: Types.ObjectId, ref: "User", required: true, index: true },
    documentInfo: { type: documentInfoSchema, required: true },
    clientSnapshot: { type: clientSnapshotSchema, required: true },
    companySnapshot: { type: companySnapshotSchema, required: true },
    pages: { type: [invoicePageSchema], default: [] },
    totals: { type: totalsSchema, required: true },
    branding: {
      customLogoUrl: { type: String, default: "" },
      customSignatureUrl: { type: String, default: "" },
    },
    status: {
      type: String,
      enum: ["unpaid", "partial", "paid", "overdue"],
      default: "unpaid",
      index: true,
    },
    dueDate: { type: Date, required: true, index: true },
  },
  schemaOptions
);

invoiceSchema.index({ projectId: 1, status: 1, dueDate: 1 });
