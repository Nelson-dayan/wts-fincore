import { model, models } from "mongoose";
import { projectSchema } from "@/lib/db/schemas/project.schema";

if (models.Project && !models.Project.schema.path("assignedMembers")) {
  delete (models as Record<string, unknown>).Project;
}

export const ProjectModel = models.Project ?? model("Project", projectSchema);
