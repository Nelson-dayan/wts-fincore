import { Schema } from "mongoose";
import { schemaOptions } from "@/lib/db/schemas/shared.schema";

export const companySettingsSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, default: "" },
    contactName: { type: String, default: "" },
    email: { type: String, default: "", lowercase: true, trim: true },
    website: { type: String, default: "" },
    logoUrl: { type: String, default: "" },
    signatureUrl: { type: String, default: "" },
  },
  schemaOptions
);
