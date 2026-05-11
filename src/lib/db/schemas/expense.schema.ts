import { Schema, Types } from "mongoose";
import { decimalField, schemaOptions } from "@/lib/db/schemas/shared.schema";

export const expenseSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    
    amount: decimalField,
    currency: { type: String, required: true },
    baseAmount: decimalField,
    exchangeRate: decimalField,
    
    category: {
      type: String,
      enum: ["SALARY", "TOOLS", "ADS", "INFRA", "OTHER"],
      required: true,
      index: true
    },
    
    companyId: { type: Types.ObjectId, ref: "Company", required: true, index: true },
    projectId: { type: Types.ObjectId, ref: "Project", required: true, index: true },
    invoiceId: { type: Types.ObjectId, ref: "Invoice", index: true }, // Optional link to specific invoice
    
    note: { type: String, default: "" },
    
    createdBy: { type: Types.ObjectId, ref: "User", required: true, index: true },
    updatedBy: { type: Types.ObjectId, ref: "User" },
    
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date }
  },
  schemaOptions
);

expenseSchema.index({ projectId: 1, category: 1, createdAt: -1 });
