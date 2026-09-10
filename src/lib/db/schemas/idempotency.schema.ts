import { Schema, Types } from "mongoose";

export const idempotencySchema = new Schema(
  {
    key: { type: String, required: true },
    userId: { type: Types.ObjectId, ref: "User", required: true, index: true },
    route: { type: String, required: true },
    requestHash: { type: String, required: true }, // SHA-256 hash of payload
    status: {
      type: String,
      enum: ["PROCESSING", "SUCCESS", "FAILED"],
      required: true,
      index: true,
    },
    responseBody: { type: Schema.Types.Mixed },
    responseStatus: { type: Number },
    expiresAt: { type: Date, required: true }, // Native TTL expiration
  },
  { timestamps: true }
);

// Enforce unique idempotency key scope per user
idempotencySchema.index({ key: 1, userId: 1 }, { unique: true });

// TTL index to automatically purge old records via MongoDB background task
idempotencySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
