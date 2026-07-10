import { Schema, Types } from "mongoose";
import { schemaOptions } from "@/lib/db/schemas/shared.schema";

export const activityLogSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: "User", required: true, index: true },
    action: { type: String, required: true, trim: true, index: true },
    entityType: { type: String, required: true, trim: true, index: true },
    entityId: { type: Types.ObjectId, required: true, index: true },
    message: { type: String, default: "" },
    projectId: { type: Types.ObjectId, ref: "Project", index: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  schemaOptions
);

activityLogSchema.index({ projectId: 1, createdAt: -1 });
activityLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
