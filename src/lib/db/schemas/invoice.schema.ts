import { Schema, Types } from "mongoose";
import {
  clientSnapshotSchema,
  companySnapshotSchema,
  decimalField,
  documentInfoSchema,
  schemaOptions,
  totalsSchema,
} from "@/lib/db/schemas/shared.schema";

const bankDetailSchema = new Schema(
  {
    accountName: { type: String, default: "" },
    accountNo: { type: String, default: "" },
    iban: { type: String, default: "" },
    bankName: { type: String, default: "" },
    swift: { type: String, default: "" },
  },
  { _id: false }
);

const invoiceExtrasSchema = new Schema(
  {
    paymentTerms: { type: String, default: "30 DAYS" },
    companyTrn: { type: String, default: "" },
    clientTrn: { type: String, default: "" },
    shipToCompany: { type: String, default: "" },
    shipToAddress: { type: String, default: "" },
    shipToTrn: { type: String, default: "" },
    poNumberRef: { type: String, default: "" },
    bankAed: { type: bankDetailSchema, default: () => ({}) },
    bankUsd: { type: bankDetailSchema, default: () => ({}) },
    footerTerms: { type: String, default: "" },
    footerCurrencyLine: { type: String, default: "CURRENCY IN AED" },
    disclaimer: {
      type: String,
      default:
        "This is an electronically generated invoice, hence does not require signature.",
    },
    amountInWords: { type: String, default: "" },
  },
  { _id: false }
);

const invoiceItemSchema = new Schema(
  {
    number: { type: Number, required: true, min: 1 },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    quantity: { type: Number, required: true, min: 0 },
    price: decimalField,
  },
  { _id: false }
);

const invoicePageSchema = new Schema(
  {
    pageNumber: { type: Number, required: true, min: 1 },
    items: { type: [invoiceItemSchema], default: [] },
  },
  { _id: false }
);

export const invoiceSchema = new Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true, index: true },
    companyId: { type: Types.ObjectId, ref: "Company", index: true },
    invoiceType: { type: String, enum: ["aed", "usd"], default: "aed", index: true },
    currency: { type: String, default: "AED" },
    baseCurrency: { type: String, default: "INR" },
    exchangeRate: decimalField,
    projectId: { type: Types.ObjectId, ref: "Project", required: true, index: true },
    poId: { type: Types.ObjectId, ref: "PurchaseOrder", index: true },
    createdBy: { type: Types.ObjectId, ref: "User", required: true, index: true },
    documentInfo: { type: documentInfoSchema, required: true },
    clientSnapshot: { type: clientSnapshotSchema, required: true },
    companySnapshot: { type: companySnapshotSchema, required: true },
    pages: { type: [invoicePageSchema], default: [] },
    totals: { type: totalsSchema, required: true },
    totalAmountBase: decimalField,
    totalsCache: {
      totalReceivedBase: decimalField,
      totalFeesBase: decimalField,
      totalIntendedBase: decimalField,
      overpaidAmountBase: decimalField,
      lastCalculatedAt: { type: Date },
      version: { type: Number, default: 0 }
    },
    branding: {
      customLogoUrl: { type: String, default: "" },
      customSignatureUrl: { type: String, default: "" },
    },
    status: {
      type: String,
      enum: ["DRAFT", "SENT", "PARTIAL", "PAID", "OVERDUE", "CANCELLED"],
      default: "DRAFT",
      index: true,
    },
    dueDate: { type: Date, required: true, index: true },
    extras: { type: invoiceExtrasSchema, default: () => ({}) },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date }
  },
  schemaOptions
);

invoiceSchema.index({ companyId: 1, invoiceNumber: 1 }, { unique: true });
invoiceSchema.index({ companyId: 1, projectId: 1, status: 1, dueDate: 1 });
invoiceSchema.index({ poId: 1, createdAt: -1 });
invoiceSchema.index({ isDeleted: 1 });
