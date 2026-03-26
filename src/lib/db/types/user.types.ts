import type { Types } from "mongoose";
import type { UserRole } from "./roles";

export interface IUser {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  phoneNumber: string;
  isActive: boolean;
  createdAt: Date;
}
