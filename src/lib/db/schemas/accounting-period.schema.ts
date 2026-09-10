import { Schema } from "mongoose";

/**
 * Defines a fiscal or accounting period that can be locked to enforce
 * data immutability on finalized historical records.
 */
export const accountingPeriodSchema = new Schema(
  {
    name: { type: String, required: true, unique: true }, // e.g., "FY2026"
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isClosed: { type: Boolean, default: false, index: true },
    closedAt: { type: Date },
    closedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);
