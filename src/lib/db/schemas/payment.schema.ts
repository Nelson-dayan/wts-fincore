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
    projectId: { type: Types.ObjectId, ref: "Project", required: true, index: true },
    clientId: { type: Types.ObjectId, ref: "Client", required: true, index: true },
    companyId: { type: Types.ObjectId, ref: "Company", required: true, index: true },
    accountId: { type: Types.ObjectId, ref: "Account", required: true, index: true },
    
    // Kept temporarily for backward compatibility during migration
    invoiceId: { type: Types.ObjectId, ref: "Invoice", index: true },
    
    direction: { type: String, enum: ["INCOMING", "OUTGOING"], default: "INCOMING", index: true },
    type: { type: String, enum: ["PAYMENT", "REFUND", "ADJUSTMENT"], default: "PAYMENT", index: true },
    status: { type: String, enum: ["PENDING", "COMPLETED", "FAILED", "REFUNDED"], default: "COMPLETED", index: true },
    
    method: {
      type: String,
      enum: ["UPI", "BANK_TRANSFER", "PAYPAL", "STRIPE", "WISE", "CASH"],
      required: true,
      index: true,
    },
    
    referenceNumber: { type: String, trim: true },
    /** @deprecated Use referenceNumber */
    transactionId: { type: String },
    
    currency: { type: String, required: true },
    amount: decimalField, // Net amount received in account
    
    // Optional: if we want to track the total sent vs net received
    totalSentAmount: optionalDecimalField,
    feeAmount: { ...optionalDecimalField, default: "0" },
    feeAmountBase: { ...optionalDecimalField, default: "0" },
    
    // Base Currency (e.g. INR) conversion for reporting
    exchangeRateToBase: decimalField,
    amountBase: decimalField,
    
    receivedAt: { type: Date, default: Date.now, index: true },
    savedAt: { type: Date, default: Date.now },
    
    note: { type: String, default: "" },
    
    paymentCurrency: { type: String },
    paymentAmountGross: optionalDecimalField,
    paymentAmountNet: optionalDecimalField,
    fees: { type: [paymentFeeSchema], default: [] },
    
    createdBy: { type: Types.ObjectId, ref: "User", required: true, index: true },
    updatedBy: { type: Types.ObjectId, ref: "User" },
    
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date }
  },
  schemaOptions
);

paymentSchema.index({ projectId: 1, createdAt: -1 });
paymentSchema.index({ accountId: 1, createdAt: -1 });
paymentSchema.index({ referenceNumber: 1 }, { unique: true, sparse: true });
