import { Schema } from "mongoose";
import { schemaOptions } from "@/lib/db/schemas/shared.schema";

const companyBrandingSchema = new Schema(
  {
    logoUrl: { type: String, default: "" },
    logoText: { type: String, default: "" },
    signatureUrl: { type: String, default: "" },
    signatureText: { type: String, default: "" },
    companySealUrl: { type: String, default: "" },
    invoicePrefix: { type: String, default: "INV" },
    quotationPrefix: { type: String, default: "QT" },
    poPrefix: { type: String, default: "PO" },
    invoiceFooter: { type: String, default: "" },
    bankDetailsText: { type: String, default: "" },
  },
  { _id: false }
);

export const companySchema = new Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    code: { type: String, required: true, uppercase: true, trim: true, index: true },
    kind: {
      type: String,
      enum: ["holding", "operating", "branch", "division"],
      default: "operating",
      index: true,
    },
    parentCompanyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      default: null,
      index: true,
    },
    address: { type: String, default: "" },
    contactName: { type: String, default: "" },
    email: { type: String, default: "", lowercase: true, trim: true, index: true },
    phone: { type: String, default: "" },
    website: { type: String, default: "" },
    taxId: { type: String, default: "", trim: true },
    
    baseCurrency: { type: String, default: "AED", trim: true },
    supportedCurrencies: [{ type: String, trim: true }],
    
    // Legacy image text compatibility fields
    logoText: { type: String, default: "" },
    signatureText: { type: String, default: "" },

    branding: { type: companyBrandingSchema, default: () => ({}) },
    
    isActive: { type: Boolean, default: true, index: true },
    isPrimary: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  schemaOptions
);

companySchema.index({ isPrimary: 1, updatedAt: -1 });
companySchema.index({ parentCompanyId: 1, kind: 1 });

