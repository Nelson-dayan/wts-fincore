import { Schema, Types } from "mongoose";
import { decimalField, schemaOptions } from "@/lib/db/schemas/shared.schema";

export const accountTransactionSchema = new Schema(
  {
    accountId: { type: Types.ObjectId, ref: "Account", required: true, index: true },
    paymentId: { type: Types.ObjectId, ref: "Payment", index: true }, // Optional: link to payment event
    transferId: { type: Types.ObjectId, ref: "Transfer", index: true }, // Optional: link to transfer event
    
    type: {
      type: String,
      enum: ["CREDIT", "DEBIT"],
      required: true,
      index: true,
    },
    
    amount: decimalField,
    currency: { type: String, required: true },
    
    balanceBefore: decimalField,
    balanceAfter: decimalField,
    
    note: { type: String, default: "" },
    
    createdBy: { type: Types.ObjectId, ref: "User", required: true },
  },
  { 
    ...schemaOptions,
    timestamps: { createdAt: true, updatedAt: false } // Transactions are immutable
  }
);

accountTransactionSchema.index({ accountId: 1, createdAt: -1 });
