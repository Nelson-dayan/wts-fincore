import { Schema, Types } from "mongoose";
import { schemaOptions } from "@/lib/db/schemas/shared.schema";
import { DEFAULT_CURRENCY, SUPPORTED_CURRENCY_VALUES } from "@/lib/constants/finance";

export const clientSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    company: { type: String, default: "", trim: true, index: true },
    website: { type: String, default: "" },
    
    // New Advanced B2B Fields
    taxId: { type: String, default: "", trim: true },
    currency: { type: String, enum: SUPPORTED_CURRENCY_VALUES, default: DEFAULT_CURRENCY, trim: true },
    paymentTerms: { type: String, default: "", trim: true },
    status: { type: String, enum: ["ACTIVE", "INACTIVE"], default: "ACTIVE", index: true },
    notes: { type: String, default: "" },

    // Location Fields
    billingAddress: { type: String, default: "" },
    shippingAddress: { type: String, default: "" },
    country: { type: String, default: "" },
    state: { type: String, default: "" },
    city: { type: String, default: "" },
    zipCode: { type: String, default: "" },

    // Legacy Location (kept for backward compatibility)
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
    parentCompanyId: {
      type: Types.ObjectId,
      ref: "Company",
      index: true,
    },
    createdBy: { type: Types.ObjectId, ref: "User", required: true, index: true },
  },
  schemaOptions
);
