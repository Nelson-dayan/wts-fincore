import { model, models } from "mongoose";
import { activityLogSchema } from "@/lib/db/schemas/activity-log.schema";

export const ActivityLogModel =
  models.ActivityLog ?? model("ActivityLog", activityLogSchema);
