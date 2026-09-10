import { Schema } from "mongoose";

export const schemaOptions = {
  _id: true,
  versionKey: false,
  timestamps: true,
} as const;

export const decimalField = {
  type: Schema.Types.Decimal128,
  required: true,
  get: (value: unknown) => {
    if (value == null) return value;
    return Number.parseFloat(String(value));
  },
};

export const optionalDecimalField = {
  type: Schema.Types.Decimal128,
  get: (value: unknown) => {
    if (value == null) return value;
    return Number.parseFloat(String(value));
  },
};

export const documentInfoSchema = new Schema(
  {
    quotationCode: { type: String, default: "" },
    /** @deprecated Use quotationCode; kept for legacy Mongo documents */
    geCode: { type: String, default: "" },
    date: { type: Date, required: true },
    subject: { type: String, default: "" },
    title: { type: String, default: "" },
    description: { type: String, default: "" },
    taxRate: { type: Number, default: 0, min: 0 },
    taxEnabled: { type: Boolean, default: false },
  },
  { _id: false }
);

export const clientSnapshotSchema = new Schema(
  {
    name: { type: String, required: true },
    company: { type: String, default: "" },
    address: { type: String, default: "" },
    logoText: { type: String, default: "" },
    signatureText: { type: String, default: "" },
  },
  { _id: false }
);

export const companySnapshotSchema = new Schema(
  {
    name: { type: String, required: true },
    address: { type: String, default: "" },
    email: { type: String, default: "" },
    website: { type: String, default: "" },
    logoUrl: { type: String, default: "" },
    logoText: { type: String, default: "" },
    signatureText: { type: String, default: "" },
  },
  { _id: false }
);

export const totalsSchema = new Schema(
  {
    subtotal: decimalField,
    tax: decimalField,
    total: decimalField,
  },
  { _id: false }
);
