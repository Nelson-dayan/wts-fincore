import { Schema, Types } from "mongoose";
import { schemaOptions } from "@/lib/db/schemas/shared.schema";
import { ProjectContactRole } from "@/types/contact";

export const projectContactAssignmentSchema = new Schema(
  {
    projectId: { type: Types.ObjectId, ref: "Project", required: true, index: true },
    contactId: { type: Types.ObjectId, ref: "Contact", required: true, index: true },
    role: {
      type: String,
      enum: Object.values(ProjectContactRole),
      required: true,
      index: true,
    },
    createdBy: { type: Types.ObjectId, ref: "User", required: true },
  },
  schemaOptions
);

// Compound unique index to prevent exact duplicate role assignments per contact per project
projectContactAssignmentSchema.index({ projectId: 1, contactId: 1, role: 1 }, { unique: true });
