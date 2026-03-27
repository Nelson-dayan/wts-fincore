import { model, models } from "mongoose";
import { projectSchema } from "@/lib/db/schemas/project.schema";

export const ProjectModel = models.Project ?? model("Project", projectSchema);
