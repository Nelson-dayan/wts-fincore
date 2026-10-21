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
    rateSource: { 
      type: String, 
      enum: ["LIVE_API", "FALLBACK_STATIC", "MANUAL_OVERRIDE"], 
      default: "MANUAL_OVERRIDE" 
    },
    benchmarkRate: { type: Number },
    rateDeviationPercent: { type: Number, default: 0 },
    overrideReason: { type: String, default: "" },

    fees: { ...decimalField, default: "0" },
    
    reference: { type: String, default: "" },
    note: { type: String, default: "" },
    
    status: { 
      type: String, 
      enum: ["PENDING", "PENDING_APPROVAL", "COMPLETED", "FAILED", "REJECTED"], 
      default: "COMPLETED",
      index: true 
    },
    
    approvedBy: { type: Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },

    createdBy: { type: Types.ObjectId, ref: "User", required: true },
  },
  schemaOptions
);
