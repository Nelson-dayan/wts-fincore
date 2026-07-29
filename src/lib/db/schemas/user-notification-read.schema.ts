import { Schema } from "mongoose";

export interface IUserNotificationRead {
  userId: string;
  notificationId: string;
  readAt: Date;
}

export const UserNotificationReadSchema = new Schema<IUserNotificationRead>(
  {
    userId: { type: String, required: true, index: true },
    notificationId: { type: String, required: true, index: true },
    readAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

// Compound index so a user cannot have duplicate read markers for the same notification
UserNotificationReadSchema.index({ userId: 1, notificationId: 1 }, { unique: true });
