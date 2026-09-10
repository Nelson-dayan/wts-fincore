import mongoose, { model, models } from "mongoose";
import { projectContactAssignmentSchema } from "@/lib/db/schemas/project-contact-assignment.schema";

if (process.env.NODE_ENV === "development" && models.ProjectContactAssignment) {
  delete mongoose.models.ProjectContactAssignment;
}

export const ProjectContactAssignmentModel =
  models.ProjectContactAssignment ?? model("ProjectContactAssignment", projectContactAssignmentSchema);
