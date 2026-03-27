import { Schema, Types } from "mongoose";
import { decimalField, schemaOptions } from "@/lib/db/schemas/shared.schema";

export const expenseSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    amount: decimalField,
    category: { type: String, required: true, trim: true, index: true },
    projectId: { type: Types.ObjectId, ref: "Project", index: true },
    createdBy: { type: Types.ObjectId, ref: "User", required: true, index: true },
  },
  schemaOptions
);

expenseSchema.index({ projectId: 1, category: 1, createdAt: -1 });
