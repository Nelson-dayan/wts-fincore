import { Schema, Types } from "mongoose";
import { schemaOptions } from "@/lib/db/schemas/shared.schema";

export const contactSchema = new Schema(
  {
    companyId: { type: Types.ObjectId, ref: "Company", required: true, index: true },
    clientId: { type: Types.ObjectId, ref: "Client", default: null, index: true },
    firstName: { type: String, required: true, trim: true, index: true },
    lastName: { type: String, required: true, trim: true, index: true },
    email: { type: String, default: "", lowercase: true, trim: true, index: true },
    phone: { type: String, default: "", trim: true },
    alternatePhone: { type: String, default: "", trim: true },
    jobTitle: { type: String, default: "", trim: true },
    department: { type: String, default: "", trim: true },
    notes: { type: String, default: "" },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
      index: true,
    },
    createdBy: { type: Types.ObjectId, ref: "User", required: true, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
  },
  schemaOptions
);

contactSchema.index({ firstName: "text", lastName: "text", email: "text", jobTitle: "text" });
