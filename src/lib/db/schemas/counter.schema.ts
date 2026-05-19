import { Schema, Types } from "mongoose";

/**
 * Thread-safe atomic counters for sequential numbering partitioned by fiscal year.
 */
export const counterSchema = new Schema({
  key: { type: String, required: true },       // e.g., "invoice_number"
  fiscalYear: { type: String, required: true }, // e.g., "2026"
  sequenceValue: { type: Number, default: 0 },
});

// Enforce compound uniqueness across counter name & year
counterSchema.index({ key: 1, fiscalYear: 1 }, { unique: true });

/**
 * Audit log mapping atomic sequence reservations to users and entity drafts.
 */
export const sequenceReservationSchema = new Schema(
  {
    key: { type: String, required: true },
    fiscalYear: { type: String, required: true },
    value: { type: Number, required: true },
    entityType: {
      type: String,
      enum: ["Invoice", "Quotation", "PurchaseOrder"],
      required: true,
    },
    entityId: { type: Schema.Types.ObjectId },
    reservedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reservedAt: { type: Date, default: Date.now },
  }
);

// Uniquely document each reserved value
sequenceReservationSchema.index({ key: 1, fiscalYear: 1, value: 1 }, { unique: true });
