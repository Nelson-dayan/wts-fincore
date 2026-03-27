import { Schema, Types } from "mongoose";
import { decimalField, schemaOptions } from "@/lib/db/schemas/shared.schema";

export const paymentSchema = new Schema(
  {
    invoiceId: { type: Types.ObjectId, ref: "Invoice", required: true, index: true },
    amount: decimalField,
    method: {
      type: String,
      enum: ["cash", "bank", "upi"],
      required: true,
      index: true,
    },
    transactionId: { type: String, default: "", index: true },
    note: { type: String, default: "" },
  },
  schemaOptions
);

paymentSchema.index({ invoiceId: 1, createdAt: -1 });
