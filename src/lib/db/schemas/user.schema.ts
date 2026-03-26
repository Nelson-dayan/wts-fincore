import { Schema } from "mongoose";
import { DEFAULT_ROLE, USER_ROLES } from "@/lib/db/types/roles";
import type { IUser } from "@/lib/db/types/user.types";

export const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: USER_ROLES, default: DEFAULT_ROLE },
    phoneNumber: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true, versionKey: false }
);
