import { Schema, Types } from "mongoose";
import { optionalDecimalField, schemaOptions } from "@/lib/db/schemas/shared.schema";
import { DEFAULT_CURRENCY, SUPPORTED_CURRENCY_VALUES } from "@/lib/constants/finance";


const modulePermissionSchema = new Schema(
  {
    view: { type: Boolean, default: true },
    create: { type: Boolean, default: false },
    edit: { type: Boolean, default: false },
    delete: { type: Boolean, default: false },
  },
  { _id: false }
);

export const projectMemberSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: "User", required: true },
    rolePreset: { type: String, enum: ["manager", "editor", "viewer", "custom"], default: "custom" },
    permissions: {
      quotations: { type: modulePermissionSchema, default: () => ({ view: true, create: false, edit: false, delete: false }) },
      purchaseOrders: { type: modulePermissionSchema, default: () => ({ view: true, create: false, edit: false, delete: false }) },
      invoices: { type: modulePermissionSchema, default: () => ({ view: true, create: false, edit: false, delete: false }) },
      expenses: { type: modulePermissionSchema, default: () => ({ view: true, create: false, edit: false, delete: false }) },
      projectDetails: {
        view: { type: Boolean, default: true },
        edit: { type: Boolean, default: false },
      },
    },
  },
  { _id: false }
);

export const projectSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    description: { type: String, default: "" },
    companyId: { type: Types.ObjectId, ref: "Company", index: true },
    clientId: { type: Types.ObjectId, ref: "Client", required: true, index: true },
    assignedTo: [{ type: Types.ObjectId, ref: "User", index: true }],
    assignedMembers: { type: [projectMemberSchema], default: [] },
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
    category: {
      type: String,
      enum: ["Fixed Price", "Retainer", "Time & Materials", "Other"],
      default: "Fixed Price",
      trim: true,
    },
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
