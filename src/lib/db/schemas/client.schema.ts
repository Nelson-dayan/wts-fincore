import { Schema, Types } from "mongoose";
import { schemaOptions } from "@/lib/db/schemas/shared.schema";

export const clientSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    company: { type: String, default: "", trim: true, index: true },
    address: { type: String, default: "" },
    email: { type: String, default: "", lowercase: true, trim: true, index: true },
    phone: { type: String, default: "" },
    clientLogoUrl: { type: String, default: "" },
    createdBy: { type: Types.ObjectId, ref: "User", required: true, index: true },
  },
  schemaOptions
);
