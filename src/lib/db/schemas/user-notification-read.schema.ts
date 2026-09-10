import { Schema } from "mongoose";

export interface IUserNotificationRead {
  userId: string;
  notificationId: string;
  readAt: Date;
  dismissed: boolean;
}

export const UserNotificationReadSchema = new Schema<IUserNotificationRead>(
  {
    userId: { type: String, required: true, index: true },
    notificationId: { type: String, required: true, index: true },
    readAt: { type: Date, default: Date.now },
    dismissed: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

UserNotificationReadSchema.index({ userId: 1, notificationId: 1 }, { unique: true });
