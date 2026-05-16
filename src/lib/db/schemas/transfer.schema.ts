import { Schema, Types } from "mongoose";
import { decimalField, schemaOptions } from "@/lib/db/schemas/shared.schema";

export const transferSchema = new Schema(
  {
    fromAccountId: { type: Types.ObjectId, ref: "Account", required: true, index: true },
    toAccountId: { type: Types.ObjectId, ref: "Account", required: true, index: true },
    
    fromAmount: decimalField,
    fromCurrency: { type: String, required: true },
    
    toAmount: decimalField,
    toCurrency: { type: String, required: true },
    
    exchangeRate: decimalField,
    fees: { ...decimalField, default: "0" },
    
    reference: { type: String, default: "" },
    note: { type: String, default: "" },
    
    status: { 
      type: String, 
      enum: ["PENDING", "COMPLETED", "FAILED"], 
      default: "COMPLETED",
      index: true 
    },
    
    createdBy: { type: Types.ObjectId, ref: "User", required: true },
  },
  schemaOptions
);
