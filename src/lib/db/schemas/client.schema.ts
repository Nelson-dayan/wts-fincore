import { Schema, Types } from "mongoose";
import { schemaOptions } from "@/lib/db/schemas/shared.schema";

export const clientSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    company: { type: String, default: "", trim: true, index: true },
    website: { type: String, default: "" },
    address: { type: String, default: "" },
    email: { type: String, default: "", lowercase: true, trim: true, index: true },
    phone: { type: String, default: "" },
    // Legacy compatibility field for previously stored URL-based logo records.
    clientLogoUrl: { type: String, default: "" },
    clientLogoText: { type: String, default: "" },
    clientSignatureText: { type: String, default: "" },
    companyId: {
      type: Types.ObjectId,
      ref: "Company",
      index: true,
    },
    createdBy: { type: Types.ObjectId, ref: "User", required: true, index: true },
  },
  schemaOptions
);
