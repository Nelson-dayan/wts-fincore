import { models, model } from "mongoose";
import { CustomNotificationSchema, ICustomNotification } from "../schemas/custom-notification.schema";

export const CustomNotificationModel =
  models.CustomNotification ||
  model<ICustomNotification>("CustomNotification", CustomNotificationSchema);
