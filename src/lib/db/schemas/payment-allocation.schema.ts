import { Schema, Types } from "mongoose";
import { decimalField, schemaOptions } from "@/lib/db/schemas/shared.schema";

export const paymentAllocationSchema = new Schema(
  {
    paymentId: { type: Types.ObjectId, ref: "Payment", required: true, index: true },
    invoiceId: { type: Types.ObjectId, ref: "Invoice", required: true, index: true },
    projectId: { type: Types.ObjectId, ref: "Project", required: true, index: true },
    
    allocatedAmount: decimalField, // In Invoice Currency
    allocatedCurrency: { type: String, required: true },
    
    // Amount in system base currency (e.g. INR) for reporting
    allocatedAmountBase: decimalField,
    
    exchangeRateUsed: decimalField, // Rate from Payment Currency to Invoice Currency
    exchangeRateToBase: decimalField, // Rate from Invoice Currency to System Base Currency
    
    note: { type: String, default: "" },
    allocatedAt: { type: Date, default: Date.now },
    
    createdBy: { type: Types.ObjectId, ref: "User", required: true },
  },
  schemaOptions
);

paymentAllocationSchema.index({ paymentId: 1, invoiceId: 1 }, { unique: true });
paymentAllocationSchema.index({ invoiceId: 1, createdAt: -1 });
paymentAllocationSchema.index({ projectId: 1, createdAt: -1 });
