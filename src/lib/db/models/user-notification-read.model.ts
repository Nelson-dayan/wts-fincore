import { models, model } from "mongoose";
import { UserNotificationReadSchema, IUserNotificationRead } from "../schemas/user-notification-read.schema";

export const UserNotificationReadModel =
  models.UserNotificationRead ||
  model<IUserNotificationRead>("UserNotificationRead", UserNotificationReadSchema);
