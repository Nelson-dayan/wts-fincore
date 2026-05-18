import { Schema, Types } from "mongoose";
import { optionalDecimalField, schemaOptions } from "@/lib/db/schemas/shared.schema";
import { DEFAULT_CURRENCY, SUPPORTED_CURRENCY_VALUES } from "@/lib/constants/finance";


export const projectSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    description: { type: String, default: "" },
    clientId: { type: Types.ObjectId, ref: "Client", required: true, index: true },
    assignedTo: [{ type: Types.ObjectId, ref: "User", index: true }],
    status: {
      type: String,
      enum: ["active", "completed", "on_hold"],
      default: "active",
      index: true,
    },
    budget: optionalDecimalField,
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
      index: true,
    },
    
    // New Advanced B2B Fields
    currency: { type: String, enum: SUPPORTED_CURRENCY_VALUES, default: DEFAULT_CURRENCY, trim: true },
    category: { type: String, default: "", trim: true },
    clientReference: { type: String, default: "", trim: true },
    notes: { type: String, default: "" },
    
    // Timeline Fields
    startDate: { type: Date },
    targetEndDate: { type: Date },
    actualEndDate: { type: Date },
    fixCurrency: { type: Boolean, default: false },
  },
  schemaOptions
);
