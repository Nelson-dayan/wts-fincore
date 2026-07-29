import { Schema } from "mongoose";

export interface ICustomNotification {
  title: string;
  description: string;
  severity: "high" | "medium" | "info";
  target: "all" | "admin" | "employee";
  actionUrl?: string;
  createdBy: string;
  createdByName?: string;
  createdAt: Date;
}

export const CustomNotificationSchema = new Schema<ICustomNotification>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    severity: { type: String, enum: ["high", "medium", "info"], default: "info" },
    target: { type: String, enum: ["all", "admin", "employee"], default: "all" },
    actionUrl: { type: String, default: "" },
    createdBy: { type: String, required: true },
    createdByName: { type: String, default: "Admin" },
  },
  {
    timestamps: true,
  }
);
