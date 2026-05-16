import { Schema, Types } from "mongoose";
import { decimalField, optionalDecimalField, schemaOptions } from "@/lib/db/schemas/shared.schema";

const paymentFeeSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["GATEWAY_FEE", "BANK_CHARGE", "GST_ON_FEE", "FOREX", "TDS", "OTHER"],
      required: true,
    },
    label: { type: String, default: "" },
    amount: decimalField,
    currency: { type: String, required: true },
    baseAmount: decimalField,
    percentage: optionalDecimalField,
    note: { type: String, default: "" },
  },
  { _id: true }
);

export const paymentSchema = new Schema(
  {
    invoiceId: { type: Types.ObjectId, ref: "Invoice", required: true, index: true },
    companyId: { type: Types.ObjectId, ref: "Company", required: true, index: true },
    
    type: { type: String, enum: ["PAYMENT", "REFUND"], default: "PAYMENT", index: true },
    status: { type: String, enum: ["PENDING", "COMPLETED", "FAILED", "REFUNDED"], default: "COMPLETED", index: true },
    
    transactionId: { type: String },
    method: {
      type: String,
      enum: ["UPI", "BANK_TRANSFER", "PAYPAL", "STRIPE", "WISE", "CASH"],
      required: true,
      index: true,
    },
    
    sourceDetails: {
      platform: { type: String, default: "" },
      accountId: { type: String, default: "" }
    },
    
    originalPaymentId: { type: Types.ObjectId, ref: "Payment" }, // Required if type === "REFUND"
    
    currency: { type: String, required: true },
    baseCurrency: { type: String, default: "INR" },
    exchangeRate: decimalField,
    
    intendedAmount: decimalField,
    receivedAmount: decimalField,
    intendedAmountBase: decimalField,
    receivedAmountBase: decimalField,
    
    fees: { type: [paymentFeeSchema], default: [] },
    percentageOfInvoice: optionalDecimalField,
    
    note: { type: String, default: "" },
    
    createdBy: { type: Types.ObjectId, ref: "User", required: true, index: true },
    updatedBy: { type: Types.ObjectId, ref: "User" },
    
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date }
  },
  schemaOptions
);

paymentSchema.index({ invoiceId: 1, createdAt: 1 });
paymentSchema.index({ transactionId: 1 }, { unique: true, sparse: true });
