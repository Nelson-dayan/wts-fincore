import { Schema, Types } from "mongoose";
import { decimalField, schemaOptions } from "@/lib/db/schemas/shared.schema";
import { SUPPORTED_CURRENCY_VALUES } from "@/lib/constants/finance";

export const accountSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    currency: { 
      type: String, 
      enum: SUPPORTED_CURRENCY_VALUES, 
      required: true 
    },
    type: {
      type: String,
      enum: ["BANK", "GATEWAY", "CASH", "CRYPTO"],
      required: true,
      index: true,
    },
    provider: { type: String, default: "", trim: true }, // e.g. "Wise", "HSBC", "Stripe"
    accountNumberMasked: { type: String, default: "" },
    
    openingBalance: { ...decimalField, default: "0" },
    currentBalance: { ...decimalField, default: "0" }, // Cached derived state
    
    isPrimary: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true, index: true },
    
    companyId: { type: Types.ObjectId, ref: "Company", required: true, index: true },
    createdBy: { type: Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Types.ObjectId, ref: "User" },
  },
  schemaOptions
);

accountSchema.index({ companyId: 1, name: 1 }, { unique: true });
