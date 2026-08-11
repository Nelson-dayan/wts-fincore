import { Schema, Types } from "mongoose";
import {
  clientSnapshotSchema,
  companySnapshotSchema,
  decimalField,
  documentInfoSchema,
  optionalDecimalField,
  schemaOptions,
  totalsSchema,
} from "@/lib/db/schemas/shared.schema";
import { DEFAULT_CURRENCY, SUPPORTED_CURRENCY_VALUES } from "@/lib/constants/finance";


const quotationItemSchema = new Schema(
  {
    number: { type: Number, required: true, min: 1 },
    name: { type: String, required: true },
    displayName: { type: String, default: "" },
    description: { type: String, default: "" },
    length: { type: Number, min: 0 },
    width: { type: Number, min: 0 },
    quantity: { type: Number, required: true, min: 0 },
    price: decimalField,
  },
  { _id: false }
);

const quotationPageSchema = new Schema(
  {
    pageNumber: { type: Number, required: true, min: 1 },
    items: { type: [quotationItemSchema], default: [] },
  },
  { _id: false }
);

const quotationBrandingSchema = new Schema(
  {
    useCompanyLogo: { type: Boolean, default: true },
    useCompanySignature: { type: Boolean, default: true },
    showClientSignature: { type: Boolean, default: false },
    customLogoText: { type: String, default: "" },
    customSignatureText: { type: String, default: "" },
  },
  { _id: false }
);

export const quotationSchema = new Schema(
  {
    quotationNumber: { type: String, required: true, unique: true, index: true },
    companyId: { type: Types.ObjectId, ref: "Company", index: true },
    projectId: { type: Types.ObjectId, ref: "Project", required: true, index: true },
    createdBy: { type: Types.ObjectId, ref: "User", required: true, index: true },
    documentInfo: { type: documentInfoSchema, required: true },
    clientSnapshot: { type: clientSnapshotSchema, required: true },
    companySnapshot: { type: companySnapshotSchema, required: true },
    pages: { type: [quotationPageSchema], default: [] },
    totals: { type: totalsSchema, required: true },
    quotationInfo: {
      leadTime: { type: String, default: "" },
      confirmDate: { type: Date },
      terms: { type: String, default: "" },
      validity: { type: String, default: "" },
      remainingAmount: optionalDecimalField,
      remainingText: { type: String, default: "" },
    },
    currency: { type: String, enum: SUPPORTED_CURRENCY_VALUES, default: DEFAULT_CURRENCY },
    discount: { type: Number, default: 0 },
    branding: { type: quotationBrandingSchema, default: () => ({}) },
    internalNotes: { type: String, default: "" },
    status: {
      type: String,
      enum: ["draft", "sent", "approved", "rejected"],
      default: "draft",
      index: true,
    },
    /** Full PDF-builder payload for exact Load / round-trip (optional). */
    pdfBuilderData: { type: Schema.Types.Mixed, default: undefined },
  },
  schemaOptions
);

quotationSchema.index({ projectId: 1, status: 1 });
