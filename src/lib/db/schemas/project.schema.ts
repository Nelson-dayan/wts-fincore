import { Schema, Types } from "mongoose";
import { optionalDecimalField, schemaOptions } from "@/lib/db/schemas/shared.schema";

export const projectSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    description: { type: String, default: "" },
    clientId: { type: Types.ObjectId, ref: "Client", required: true, index: true },
    assignedTo: [{ type: Types.ObjectId, ref: "User", index: true }],
    status: {
      type: String,
      enum: ["lead", "in_progress", "completed", "on_hold"],
      default: "lead",
      index: true,
    },
    budget: optionalDecimalField,
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
      index: true,
    },
  },
  schemaOptions
);
