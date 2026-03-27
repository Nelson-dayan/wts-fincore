import { Schema } from "mongoose";
import { schemaOptions } from "@/lib/db/schemas/shared.schema";

export const companySchema = new Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    address: { type: String, default: "" },
    contactName: { type: String, default: "" },
    email: { type: String, default: "", lowercase: true, trim: true, index: true },
    website: { type: String, default: "" },
    // Image text storage (base64 data string)
    logoText: { type: String, default: "" },
    signatureText: { type: String, default: "" },
    defaultTax: {
      taxRate: { type: Number, default: 0, min: 0 },
      taxEnabled: { type: Boolean, default: false },
    },
    isPrimary: { type: Boolean, default: false, index: true },
  },
  schemaOptions
);

companySchema.index({ isPrimary: 1, updatedAt: -1 });
